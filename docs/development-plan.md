# 家庭物品管家系统开发计划

## 0. 新手友好版路线图
> 如果你是第一次做 NestJS 项目，可以按照下列“每一步都写清楚要做什么”的方式执行。完成一个小步骤再继续下一个，不用一次搞懂全部。
> 
> **每个阶段都包含：**
> - 🎯 学习目标：先学习/理解什么
> - 🛠️ 动手步骤：一步步操作
> - ✅ 检查点：完成后要验证的东西
> - 📚 推荐资料：遇到问题时可参考

---

### 准备阶段（Day 0）
**🎯 学习目标**
- 了解 NestJS 项目结构
- 明白 TypeScript、Node.js、PostgreSQL、Redis 是什么

**🛠️ 动手步骤**
1. 安装工具（Node、Nest CLI、数据库等）
   ```bash
   # Node.js 18+（官网下载安装包）
   node -v
   npm -v

   # Nest CLI
   npm install -g @nestjs/cli
   nest --version

   # 推荐装的数据库工具
   # PostgreSQL（本地或 Docker）
   # Redis（本地或 Docker）
   # RabbitMQ（后面再装也行，优先 Postgres）
   ```
2. 初始化项目
   ```bash
   nest new home-inventory
   cd home-inventory
   npm run start:dev
   # 浏览器访问 http://localhost:3000
   ```
3. 安装必备依赖（在项目里执行）
   ```bash
   npm install @nestjs/config @nestjs/typeorm typeorm pg
   npm install class-validator class-transformer
   npm install @nestjs/swagger swagger-ui-express
   npm install @nestjs/passport passport passport-jwt @nestjs/jwt
   npm install @nestjs/schedule
   npm install cache-manager cache-manager-redis-store redis
   npm install @nestjs/microservices amqplib amqp-connection-manager
   npm install @nestjs/websockets @nestjs/platform-socket.io
   npm install multer @nestjs/platform-express
   ```
4. 创建 `.env` 文件（根目录）
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/home_inventory
   DATABASE_SSL=false
   JWT_SECRET=super-secret-key
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://guest:guest@localhost:5672
   ```
5. 了解项目结构（不用一次全写完，先创建目录占位）
   ```text
   src/
     common/（拦截器、过滤器、管道、装饰器）
     modules/
       auth/
       users/
       categories/
       locations/
       items/
       stock/
       purchase-records/
       usage-records/
       stores/
       statistics/
       notifications/
       shopping-list/
     config/
     database/
     main.ts
   ```

**✅ 检查点**
- `npm run start:dev` 正常启动
- Swagger 基本页面可访问（后续 M1 配置）

**📚 推荐资料**
- NestJS 官方入门：https://docs.nestjs.com/first-steps
- TypeORM 入门：https://typeorm.io/

---

## 1. 项目概述
- **目标**：实现 `docs/requirements.md` 中定义的全部功能，交付一个面向家庭的物品管理系统（后端服务 + API 文档），并具备商业化扩展能力。
- **范围**：NestJS 后端服务、PostgreSQL 数据库、Redis、RabbitMQ、Swagger 文档、测试体系、基础 DevOps 支撑。
- **交付周期**：约 14 周（可根据团队规模调整）。

---

## 2. 里程碑排期（14 周）
| 阶段 | 周期 | 关键交付 | 对应需求优先级 |
| --- | --- | --- | --- |
| **M0** | 第 1 周 | 开发环境、基础架构脚手架、配置管理 | 支撑所有需求 |
| **M1** | 第 2-4 周 | 核心业务 MVP（物品管理、购买/使用记录、库存查询、认证） | P0 |
| **M2** | 第 5-7 周 | 提醒 & 仪表盘、购物清单、统计初版 | P1 |
| **M3** | 第 8-10 周 | 增强功能（图片、导入导出、预算、标签、盘点等） | P2 |
| **M4** | 第 11-12 周 | 高级能力（MQ、WebSocket、定时任务、日志监控） | P2 / P3 |
| **M5** | 第 13 周 | 测试、性能调优、安全加固、生产部署准备 | 全部 |
| **M6** | 第 14 周 | 验收、上线、文档与培训、商业化准备 | 全部 |

> 注：如团队规模较小，可按“周”为单位延长或交叉进行。建议每个里程碑结束时进行一次评审。

---

## 3. 阶段任务拆解 + 新手操作指南

### M0：基础准备（第 1 周，对新手来说最重要）
**🎯 学习目标**
- 熟悉 Nest 项目结构、配置模块、TypeORM 基础
- 掌握如何连接数据库、写控制器与服务

**🛠️ 动手步骤**
1. 阅读 `docs/requirements.md`，标注核心模块。
2. 在 `app.module.ts`：
   - 引入 `ConfigModule.forRoot({ isGlobal: true })`
   - 配置 `TypeOrmModule.forRootAsync`（先测试连接）
3. 新建 `modules/auth`、`modules/users` 空模块（`nest g module modules/auth`）。
4. 添加最简单的中间件/拦截器：
   - 请求日志中间件（打印 method、url）
   - 全局异常过滤器（捕获异常并返回统一格式）
5. 初始化 Git 仓库；配置 GitHub Actions（只跑 `npm run lint`、`npm run test` 即可）。

**✅ 检查点**
- `npm run start:dev` 无错误、能连接数据库
- `GET /` 返回默认响应
- 新建的中间件、过滤器能生效

**📚 推荐资料**
- Nest 中间件/拦截器：https://docs.nestjs.com/techniques
- TypeORM + Nest：https://docs.nestjs.com/techniques/database

---

### M1：核心业务 MVP（第 2-4 周，对应 P0）
> 先做“骨架”再慢慢加肉。每个模块建议按照 **Entity → DTO → Service → Controller → Test → Swagger** 的顺序开发。下面按天列出重点。

#### Day 1-2：认证模块
- 🎯 学习：`AuthModule`、`Passport`、`JWT` 用法
- 🛠️ 动手：
  1. 创建 `users` 实体（字段：id/email/password/name/status/...）
  2. 使用 `bcrypt` 在 `UsersService` 中加密密码
  3. 编写注册 `POST /auth/register`
  4. 编写登录 `POST /auth/login`：验证密码，返回 Token
  5. 写 `JwtStrategy`、`JwtAuthGuard`
- ✅ 检查：
  - 使用 Postman 注册和登录成功
  - 访问 `GET /auth/me` 时能返回当前用户
- 📚：Nest Auth 指南：https://docs.nestjs.com/security/authentication

#### Day 3-4：分类、位置模块
- 🎯 学习：`ValidationPipe`、`ClassValidator`
- 🛠️：
  1. `nest g module modules/categories` + service + controller
  2. 定义 `Category` 实体，支持 `parentId`
  3. CRUD 接口：`GET/POST/PATCH/DELETE`
  4. 添加 DTO 校验规则
  5. 同理实现 `LocationsModule`
- ✅ 检查：
  - Swagger 中能看到接口
  - 数据库成功生成类别与位置记录

#### Day 5-7：物品模块
- 🎯 学习：TypeORM 关系、一对多、多对多
- 🛠️：
  1. 定义 `Item` 实体（包含分类、默认位置、标签等）
  2. 编写 Service：创建、更新、去重检查（同名同品牌提示）
  3. Controller：列表分页、详情、删除
  4. DTO 校验（名称长度、单位必填等）
- ✅ 检查：能创建物品、重复时提示、Swagger 展示

#### Day 8-11：物品清单 Stock
- 🎯 学习：唯一约束、查询构建器
- 🛠️：
  1. 定义 `Stock` 实体（`item + location` 唯一）
  2. 编写获取库存列表接口（支持筛选）
  3. 增加手动调整数量接口，写入 `stock_adjustments`
- ✅ 检查：新增库存后能在 `/stock` 查询到，调整记录入库

#### Day 12-14：采购记录
- 🎯 学习：事务操作（`dataSource.transaction`）
- 🛠️：
  1. 定义 `purchase_records` 和 `_items` 实体
  2. `POST /purchase-records` 创建草稿
  3. `PATCH /purchase-records/:id/confirm`：开启事务 → 更新状态 → 更新库存
  4. 编写单元测试，模拟确认成功/失败场景
- ✅ 检查：库存增加正确、重复确认报错、草稿可删除

#### Day 15-17：使用记录
- 🎯 学习：事务回滚、状态流转
- 🛠️：
  1. 仿照采购模块实现使用记录
  2. 确认时扣减库存，数量不足抛异常
- ✅ 检查：正常扣减库存、取消回退、数量不足提示

#### Day 18-20：统一响应、Swagger 整理、基础测试
- 🎯 学习：拦截器、Swagger 装饰器
- 🛠️：
  1. 编写 `TransformInterceptor` 统一响应结构
  2. `@ApiTags`、`@ApiOperation`、`@ApiResponse` 整理文档
  3. 运行 `npm run test`，确保已有单元测试通过
- ✅ 检查：Swagger 文档完整、基础测试通过

> 完成提示：通过 Postman 可串联起【注册 → 登录 → 添加分类/位置 → 添加物品 → 记录购买 → 查询库存 → 记录使用】的完整流程。

---

### M2：增强体验（第 5-7 周，对应 P1）
> 目标是“让这个系统好用”，围绕提醒、仪表盘、购物清单展开。

**🎯 学习目标**
- 了解业务统计、提醒逻辑，掌握 Cron/定时任务基础

**🛠️ 动手步骤**
1. 快用完提醒：计算 `quantity <= minQuantity` → 接口返回
dash low stock list
2. 快过期提醒：计算 `expiryDate - today` → 接口、提醒列表
3. 仪表盘 API：总览数据 + 图表数据
4. 购物清单模块：自动生成 & 手动 CRUD
5. 历史查询：按条件过滤采购/使用记录
6. 操作日志：关键操作写入 `audit_logs`
7. 编写相应单元/集成测试

**✅ 检查点**
- 提醒、仪表盘接口返回正确数据
- 购物清单 CRUD 正常，标记已购可联动采购
- 日志有记录

**📚 推荐资料**
- Nest 定时任务：https://docs.nestjs.com/techniques/task-scheduling

---

### M3：高级功能集（第 8-10 周，对应 P2）
> 项目已经能用了，开始补全“锦上添花”的能力。

**🎯 学习目标**
- 文件上传、Excel 导入导出
- 复杂统计、使用频率计算
- 盘点流程设计

**🛠️ 动手步骤**
1. 商店管理：CRUD + 与采购关联
2. 图片上传：Multer + 本地/OSS
3. 批量导入导出：Excel 模板、错误处理
4. 预算管理：设置、执行、提醒
5. 使用频率 & 价格历史统计
6. 整理核对：创建任务、录入差异、调整库存
7. 高级搜索：多条件 Query Builder
8. 标签 & 数据备份功能
9. 测试覆盖率提升至 60%

**✅ 检查点**
- Excel 导入能过滤错误、导出数据正确
- 预算提醒准确
- 盘点流程能自动更新库存
- 搜索与标签功能可用

---

### M4：平台能力强化（第 11-12 周，对应 P2/P3）
> 落实 MQ、定时任务、实时通知、日志监控等平台能力。

**🎯 学习目标**
- 消息队列（RabbitMQ）
- WebSocket 推送
- 监控与日志

**🛠️ 动手步骤**
1. MQ 集成：创建模块、Producer/Consumer、处理过期/低库存/统计任务
2. 定时任务：Cron 定时发布 MQ 任务
3. WebSocket：建立通知网关，推送提醒、购物清单更新
4. 日志：Winston 结构化，输出到文件/外部系统
5. 健康检查 `/health`：数据库、Redis、MQ
6. 安全 & 缓存：Helmet、限流、Redis 缓存热点数据

**✅ 检查点**
- MQ 队列正常消费，无长时间堆积
- WebSocket 推送前端可收到
- `/health` 返回各组件状态

---

### M5：测试 & 运维准备（第 13 周）
**🎯 学习目标**
- 测试覆盖率与性能压测
- CI/CD 流程

**🛠️ 动手步骤**
1. 单元 & E2E 覆盖率 ≥ 80%
2. 性能测试：JMeter/k6 对核心接口压测
3. Docker 化：编写 `Dockerfile`、`docker-compose`
4. 配置 CI/CD：自动执行 lint/test/build/deploy
5. 安全测试：权限绕过、注入、XSS

**✅ 检查点**
- 测试报告达标
- 性能指标满足要求
- CI/CD pipeline 成功执行

---

### M6：上线与交付（第 14 周）
**🎯 学习目标**
- 验收流程与上线操作

**🛠️ 动手步骤**
1. 逐项验收 `requirements.md` 功能
2. 编写/整理以下文档：API、运维、开发、用户指南
3. 进行培训与演示
4. 准备上线策略：灰度、回滚、备份
5. 商业化准备：会员开关、计费评估

**✅ 检查点**
- 验收通过，无高优先级缺陷
- 文档齐全、有人能接手
- 上线演练成功

---

## 4. 工作分配建议
| 角色 | 主要职责 |
| --- | --- |
| 后端开发 | 模块设计、接口开发、数据库设计、消息队列集成 |
| 测试工程师 | 编写测试用例、执行功能/回归/性能测试 |
| DevOps/运维 | CI/CD、部署、监控、日志、备份策略 |
| 产品/需求 | 需求澄清、验收、用户体验反馈 |
| 前端/客户端（如有） | 配合对接 API、实现界面与交互 |

> 若团队规模较小，可由核心开发兼任测试、运维部分工作。

---

## 5. 验收标准概览
- 功能：`requirements.md` 所列 P0~P3 功能均实现并通过验收
- 质量：测试覆盖率 ≥80%，关键路径 E2E 用例通过
- 性能：核心接口并发 50 QPS 下平均响应 < 200ms（可按需要调整）
- 安全：通过权限、输入校验、安全头等基础检查
- 文档：开发、部署、运维、用户文档齐备
- 运维：支持容器化部署，具备健康检查、日志、监控、备份能力

---

## 6. 风险与应对
| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 需求范围变化 | 延期、返工 | M0/M1 明确范围，后续变更走评审流程 |
| 人力不足 | 进度延误 | 预留缓冲、调整优先级，考虑外部支援 |
| 技术风险（MQ、WebSocket 等） | 实现困难 | 提前 Spike，优先实现关键 POC |
| 质量风险 | Bug 增多 | 持续集成、代码评审、测试左移 |
| 安全/合规 | 无法上线 | 引入安全检查清单，早期纳入开发流程 |

---

## 7. 下一步行动
1. 组织 Kickoff 会议，确认范围、资源、时间
2. 制定迭代计划（每周或每两周的 Sprint）
3. 按 M0~M6 阶段稳步推进开发，并在每个里程碑做评审验收

完成以上计划，即可确保 `docs/requirements.md` 所有功能按期按质交付。祝项目顺利！
