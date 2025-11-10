# 家庭物品管家系统技术方案

> 版本：v1.0  
> 对应需求：`docs/requirements.md`（P0~P3）  
> 目标读者：技术负责人、后端工程师、测试、运维

---

## 1. 总体架构

### 1.1 架构概览
```
┌───────────────────────────────────┐
│ 前端（Web / Mobile / PWA）        │
│  - React / Vue / Native（可选）   │
└─────────────┬─────────────────────┘
              │ HTTP/HTTPS（REST API）
┌─────────────▼─────────────────────┐
│ NestJS 应用服务                    │
│  - 控制器（API 层）               │
│  - 服务层（业务逻辑）             │
│  - 实体/仓储（数据访问）         │
│  - 模块化（按领域拆分）           │
│  - 拦截器/守卫/管道/过滤器/AOP    │
└─────────────┬───────────────┬────┘
              │               │
              │               │
    ┌─────────▼────┐   ┌──────▼──────────┐
    │ PostgreSQL   │   │ Redis            │
    │  - 主数据    │   │  - 缓存          │
    │  - 关系模型   │   │  - 会话/限流     │
    └──────────────┘   │  - 分布式锁       │
                        └──────┬──────────┘
                               │
                      ┌────────▼──────────┐
                      │ RabbitMQ 消息队列 │
                      │  - 异步任务       │
                      │  - 定时提醒       │
                      │  - 事件通知       │
                      └────────┬──────────┘
                               │
                         ┌─────▼───────┐
                         │ 外部服务    │
                         │  - 邮件/短信 │
                         │  - OSS/S3    │
                         └─────────────┘
```

### 1.2 技术栈
| 层次 | 技术 | 说明 |
| --- | --- | --- |
| 语言 | TypeScript | 强类型开发，提高可靠性 |
| 框架 | NestJS 11 | 模块化、依赖注入、AOP 支持 |
| 数据库 | PostgreSQL | 关系型数据存储、事务支持 |
| ORM | TypeORM | 实体定义、查询构建器、迁移 |
| 缓存 | Redis | 高速缓存、限流、分布式锁 |
| 消息队列 | RabbitMQ | 异步任务、事件驱动 |
| 文档 | Swagger | 自动生成 API 文档 |
| 测试 | Jest / supertest | 单元 & E2E 测试 |
| 日志 | Winston / Pino | 结构化日志 |
| 部署 | Docker / CI/CD | 容器化与持续交付 |

---

## 2. 模块设计

### 2.1 功能模块划分
| 模块 | 说明 |
| --- | --- |
| `AuthModule` | 用户认证、授权、JWT、角色控制 |
| `UsersModule` | 用户管理、账号信息、家庭成员权限 |
| `CategoriesModule` | 物品分类管理（一级/二级） |
| `LocationsModule` | 家庭存放位置管理（层级） |
| `ItemsModule` | 物品基础信息管理、去重校验、标签关联 |
| `StockModule` | 物品清单、库存信息、手动调整记录 |
| `PurchaseRecordsModule` | 采购记录（主表+明细）、状态流转、事务处理 |
| `UsageRecordsModule` | 使用记录（主表+明细）、扣减校验、差异处理 |
| `ShoppingListModule` | 购物清单生成、状态管理、与采购流程联动 |
| `StoresModule` | 常去商店信息管理、采购历史统计 |
| `StatisticsModule` | 花费统计、物品使用分析、趋势分析 |
| `NotificationsModule` | 提醒管理、低库存/过期提醒、通知渠道 |
| `AttachmentsModule` | 文件上传（图片、Excel）、OSS 集成 |
| `TasksModule` | 定时任务调度、队列任务发布与消费 |
| `AuditModule` | 操作日志、整理核对（盘点）记录 |
| `CommonModule` | 通用工具、管道、拦截器、过滤器、装饰器 |

### 2.2 模块依赖关系
```
Auth ──► Users ──► Notifications
              │
              ├──► Items ──► Stock ──► Statistics
              │              │        │
              │              │        └──► Notifications
              │              │
              │              ├──► PurchaseRecords ──► Statistics
              │              └──► UsageRecords ──► Audit

ShoppingList ──► Items / Stock / PurchaseRecords
Stores ──► PurchaseRecords
Tasks ──► Statistics / Notifications
Attachments ──► Items / Stores / PurchaseRecords
```

> 注：模块之间通过服务接口调用；若存在环形依赖，使用 `forwardRef` 处理。

---

## 3. 核心流程设计

### 3.1 用户注册与登录流程
1. 用户调用 `/auth/register` → 写入 `users` 表，密码加密（bcrypt）。
2. 登录 `/auth/login` → 验证密码 → 生成 JWT（Access Token + Refresh Token）。
3. 受保护接口使用 `JwtAuthGuard`，解析 Token，注入当前用户。

### 3.2 添加物品流程
1. 用户提交物品信息 → `ItemsService.create`
2. 校验名称 + 品类 + 品牌唯一性（避免重复）
3. 写入 `items` 表；如果有标签，更新关联表。
4. 可选：上传物品图片 → `AttachmentsModule`

### 3.3 采购确认流程
```
客户端 → POST /purchase-records  (草稿)
            ↓
客户端 → PATCH /purchase-records/:id/confirm
            ↓
Nest 服务：
  - 开启事务
  - 更新记录状态为 confirmed
  - 遍历明细：更新/创建库存记录（stock）
  - 写入操作日志（audit）
  - 发布 MQ 事件（异步提醒/统计）
  - 提交事务
            ↓
客户端收到成功响应
            ↓
后台 MQ 消费者：
  - 生成提醒任务
  - 更新统计数据
  - 通知家庭成员
```

### 3.4 使用记录流程
1. 校验库存数量是否足够；不足则返回错误。
2. 更新使用记录状态；事务内扣减库存；记录调整历史。
3. 触发提醒（如数量低于阈值）和统计更新。

### 3.5 提醒与通知
- 定时任务（`@Cron`）查找以下数据：
  - 7 天内过期、3 天内过期、已过期
  - 低于 `minQuantity`、等于 0、为负
- 将提醒任务推送到 RabbitMQ 队列
- 消费者处理提醒：写入提醒表 + 推送（WebSocket/邮件/短信）
- 用户可在“提醒列表”查看、标记处理

### 3.6 购物清单流程
1. 自动生成功能基于低库存列表，生成建议购买条目。
2. 用户可手动添加、修改、删除清单项。
3. 清单状态：待购买 → 部分购买 → 已完成。
4. 清单项“标记已购”时，可跳转创建采购记录。

### 3.7 整理核对（盘点）流程
1. 创建核对任务（选择地点/分类）。
2. 录入实际数量 → 计算差异 → 生成调整建议。
3. 审核差异 → 自动更新库存 → 记录调整原因。

---

## 4. 数据模型设计（概要）
> 详细字段参考 `docs/database-design.md`（建议补充生成）。

### 4.1 核心表（部分）
| 表名 | 说明 |
| --- | --- |
| `users` | 用户信息（家庭成员） |
| `roles` / `user_roles` | 角色与权限映射 |
| `categories` | 物品分类，支持多级 |
| `locations` | 存放位置，支持多级 |
| `items` | 物品基础信息 |
| `item_tags` / `tags` | 物品标签管理 |
| `stock` | 当前库存记录（物品 + 位置） |
| `stock_adjustments` | 手动调整 / 整理核对记录 |
| `purchase_records` / `_items` | 采购主表 + 明细 |
| `usage_records` / `_items` | 使用主表 + 明细 |
| `shopping_lists` / `_items` | 购物清单 |
| `stores` | 商店信息 |
| `notifications` | 提醒消息（过期/低库存） |
| `statistics_*` | 统计结果缓存表 |
| `audit_logs` | 操作日志 |

### 4.2 ER 图（文字版概述）
```
Users 1 ─── * PurchaseRecords 1 ─── * PurchaseRecordItems * ─── 1 Items
                          │                          │
                          │                          └── 1 Locations
                          │
                          └── * Stores

Items 1 ─── * Stock * ─── 1 Locations
Items * ─── * Tags

UsageRecords * ─── 1 Users
UsageRecordItems * ─── 1 Items / Locations

ShoppingLists * ─── 1 Users
ShoppingListItems * ─── 1 Items / Locations
```

---

## 5. 接口设计原则
- **RESTful API**：遵循资源/动作约定，使用语义化路径。
- **版本管理**：预留 `v1` 前缀或头部控制。
- **请求响应格式**：统一使用 `{ success, data, message, timestamp }`。
- **错误码**：基于 HTTP 状态码，附加业务错误码（如 `INV-001`）。
- **权限控制**：通过守卫注入 `user`，判断角色/权限。
- **文档同步**：Swagger 自动生成，导出 OpenAPI 规格。

---

## 6. 通信与集成

### 6.1 外部依赖
| 组件 | 用途 | 集成方式 |
| --- | --- | --- |
| PostgreSQL | 主数据库 | TypeORM、连接池配置 |
| Redis | 缓存、限流、锁 | `cache-manager-redis-store` |
| RabbitMQ | 消息队列 | `@nestjs/microservices`、AMQP |
| OSS/S3（可选） | 文件存储 | SDK：AWS S3 / Aliyun OSS |
| 邮件/短信（可选） | 通知渠道 | SMTP / 第三方 API |

### 6.2 MQ 主题设计（参考 `docs/mq-explanation.md`）
| Exchange | Routing Key | 说明 |
| --- | --- | --- |
| `notifications` | `check.expiry` | 物品过期检查 |
| `notifications` | `low.stock.alert` | 低库存提醒 |
| `statistics` | `generate.daily` | 每日统计任务 |
| `tasks` | `items.import` | Excel 导入任务 |
| `events` | `purchase.confirmed` | 采购确认事件 |

---

## 7. 安全设计
- **认证授权**：JWT + Refresh Token、RBAC 守卫、资源权限校验。
- **输入校验**：DTO + class-validator，防止注入。
- **数据保护**：密码哈希、敏感字段脱敏、HTTPS 传输。
- **访问控制**：Rate Limiting、防暴力破解、CORS 控制。
- **日志审计**：记录关键操作日志，支持追踪。
- **备份恢复**：数据库定时备份、备份文件加密。

---

## 8. 运维与部署
- **运行环境**：Node.js 18+，Docker 容器。
- **配置管理**：`.env` + ConfigModule，区分 dev/test/prod。
- **日志**：stdout + 文件 + 外部日志平台（ELK/Grafana Loki）。
- **监控**：健康检查 `/health`，Prometheus 指标（可选）。
- **CI/CD**：GitHub Actions / GitLab CI，执行 lint/test/build/deploy。
- **部署流程**：
  1. 构建 Docker 镜像（应用 + 依赖）
  2. 执行数据库迁移
  3. 部署服务（K8s / Docker Compose）
  4. 配置域名、HTTPS，更新 Swagger 文档
- **应急回滚**：保留上一版本镜像与数据库快照。

---

## 9. 测试策略（概述）
- **单元测试**：Service / Guard / Pipe，目标覆盖率 ≥ 80%。
- **集成测试**：模块上下游交互，重点校验事务、权限。
- **E2E 测试**：关键业务流程（注册→添加→采购→使用→提醒）。
- **性能测试**：JMeter/k6，对采购/提醒接口做压力测试。
- **安全测试**：JWT 绕过、SQL 注入、XSS、弱密码检查。
- **灰度发布**：预生产环境验证后再上线生产。

---

## 10. 风险与缓解（技术面）
| 风险 | 说明 | 缓解措施 |
| --- | --- | --- |
| MQ 任务堆积 | 定时任务产生大量消息 | 设置消费者扩容、监控队列长度 |
| 事务冲突 | 高并发操作库存 | 使用行级锁、乐观锁重试、分布式锁 |
| 数据不一致 | 手动调整与记录不匹配 | 引入审计日志、调整前提示差异 |
| 性能瓶颈 | 数据量大导致查询慢 | 预先规划索引、缓存热点数据 |
| 文件存储失败 | OSS 不可用 | 提供本地备份、重试机制 |
| 安全漏洞 | 权限配置错误 | 自动化安全测试、代码审查 |

---

## 11. 参考资料
- `docs/requirements.md` —— 需求清单
- `docs/development-plan.md` —— 项目计划、排期
- `docs/nestjs-features-mapping.md` —— 技术特性覆盖
- `docs/mq-explanation.md` —— MQ 场景详解
- NestJS 官方文档：https://docs.nestjs.com/
- TypeORM 文档：https://typeorm.io/

---

**说明**：本技术方案在项目进行中应保持更新，若架构或模块调整，需同步修改并通知团队。
