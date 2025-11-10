# 家庭物品管家系统数据库设计

> 版本：v1.0  
> 对应需求：`docs/requirements.md`  
> 目标读者：后端工程师、DBA、测试

---

## 1. 设计概览
- **数据库类型**：PostgreSQL 15+
- **字符集**：UTF-8
- **命名规范**：
  - 表名使用 `snake_case`，复数形式
  - 主键统一使用 `uuid`（`UUID v4`），字段名 `id`
  - 软删除暂不启用，删除即物理删除
  - 时间字段：`created_at`、`updated_at` 默认 `CURRENT_TIMESTAMP`
- **索引策略**：主键默认索引；常用查询字段额外建立索引（见 5.）
- **关系说明**：大量一对多、多对多关系，通过中间表维护

---

## 2. 核心实体ER图（文字版）
```
users 1 ─── * purchase_records 1 ─── * purchase_record_items * ─── 1 items
                        │                          │
                        │                          └── 1 locations
                        │
                        └── * stores

items 1 ─── * stock * ─── 1 locations
items * ─── * tags

usage_records * ─── 1 users
usage_record_items * ─── 1 items / locations

shopping_lists * ─── 1 users
shopping_list_items * ─── 1 items / locations

notifications * ─── 1 users
statistics_daily * ─── 1 users
```

---

## 3. 表结构详解

### 3.1 用户与权限
| 表名 | 说明 |
| --- | --- |
| `users` | 家庭用户/成员信息 |
| `roles` | 角色定义（admin/member/guest） |
| `user_roles` | 用户与角色多对多 |

**users**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK, default uuid_generate_v4() | 主键 |
| `email` | varchar(128) | UNIQUE, NOT NULL | 登录邮箱 |
| `password` | varchar(255) | NOT NULL | bcrypt hash |
| `name` | varchar(64) | NOT NULL | 昵称/姓名 |
| `status` | varchar(16) | default 'active' | active/disabled |
| `avatar_url` | varchar(255) | NULL | 头像地址 |
| `created_at` | timestamp | default now() | 创建时间 |
| `updated_at` | timestamp | default now() | 更新时间 |

**roles**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `name` | varchar(32) | UNIQUE | admin/member/guest |
| `description` | varchar(255) | NULL |

**user_roles**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `user_id` | uuid | FK → users(id) | 用户 |
| `role_id` | uuid | FK → roles(id) | 角色 |
| PK | (`user_id`, `role_id`) | | 联合主键 |

### 3.2 分类与位置
**categories**（支持一级/二级）
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `parent_id` | uuid | FK → categories(id), NULL | 父级分类 |
| `name` | varchar(64) | NOT NULL |
| `icon` | varchar(64) | NULL |
| `sort_order` | int | default 0 |
| `created_at` / `updated_at` | timestamp | | |

**locations**（支持两级）
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `parent_id` | uuid | FK → locations(id), NULL |
| `name` | varchar(64) | NOT NULL |
| `description` | varchar(255) | NULL |
| `created_at` / `updated_at` | timestamp | | |

### 3.3 物品与标签
**items**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `category_id` | uuid | FK → categories(id) |
| `name` | varchar(128) | NOT NULL |
| `code` | varchar(64) | UNIQUE NULL | 物品编号 |
| `brand` | varchar(64) | NULL |
| `specification` | varchar(128) | NULL | 规格描述 |
| `unit` | varchar(16) | NOT NULL | 单位（个/包…） |
| `default_location_id` | uuid | FK → locations(id) | 默认存放位置 |
| `shelf_life_days` | int | NULL | 保质期（天） |
| `image_url` | varchar(255) | NULL |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |

**tags** / **item_tags**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `tags.id` | uuid | PK |
| `tags.name` | varchar(32) | UNIQUE |
| `item_tags.item_id` | uuid | FK → items(id) |
| `item_tags.tag_id` | uuid | FK → tags(id) |
| PK | (`item_id`, `tag_id`) | | |

### 3.4 库存与调整
**stock**（每个物品 + 存放位置唯一）
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `item_id` | uuid | FK → items(id) |
| `location_id` | uuid | FK → locations(id) |
| `quantity` | numeric(18,2) | default 0 |
| `min_quantity` | numeric(18,2) | default 0 | 低库存阈值 |
| `latest_purchase_price` | numeric(18,2) | NULL |
| `latest_purchase_date` | date | NULL |
| `expiry_date` | date | NULL | 最近一批的参考过期日 |
| `memo` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |
| UNIQUE | (item_id, location_id) | | |

**stock_adjustments**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `stock_id` | uuid | FK → stock(id) |
| `type` | varchar(32) | NOT NULL | manual_audit/purchase/usage |
| `quantity_before` | numeric(18,2) | NOT NULL |
| `quantity_after` | numeric(18,2) | NOT NULL |
| `reason` | varchar(64) | NULL |
| `remarks` | text | NULL |
| `created_by` | uuid | FK → users(id) |
| `created_at` | timestamp | default now() |

### 3.5 采购记录
**purchase_records**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) | 创建人 |
| `store_id` | uuid | FK → stores(id), NULL |
| `code` | varchar(32) | UNIQUE |
| `purchase_date` | date | NOT NULL |
| `status` | varchar(16) | default 'draft' | draft/confirmed/cancelled |
| `total_amount` | numeric(18,2) | default 0 |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |

**purchase_record_items**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `record_id` | uuid | FK → purchase_records(id) |
| `item_id` | uuid | FK → items(id) |
| `location_id` | uuid | FK → locations(id) |
| `quantity` | numeric(18,2) | NOT NULL |
| `unit_price` | numeric(18,2) | NULL |
| `total_price` | numeric(18,2) | NULL |
| `purchase_date` | date | NULL | 明细级别覆盖 |
| `expiry_date` | date | NULL |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |

### 3.6 使用记录
结构与采购类似。

**usage_records**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `code` | varchar(32) | UNIQUE |
| `usage_date` | date | NOT NULL |
| `type` | varchar(16) | NOT NULL | daily/expired/damaged/gift/other |
| `status` | varchar(16) | default 'draft' |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |

**usage_record_items**
| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | PK |
| `record_id` | uuid | FK → usage_records(id) |
| `item_id` | uuid | FK → items(id) |
| `location_id` | uuid | FK → locations(id) |
| `quantity` | numeric(18,2) | NOT NULL |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | | |

### 3.7 商店与预算
**stores**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | varchar(128) | UNIQUE |
| `type` | varchar(16) | NULL | online/offline |
| `contact` | varchar(64) | NULL |
| `phone` | varchar(32) | NULL |
| `address` | varchar(255) | NULL |
| `created_at` / `updated_at` | timestamp | |

**budgets**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `type` | varchar(16) | NOT NULL | overall/category |
| `category_id` | uuid | FK → categories(id) NULL |
| `amount` | numeric(18,2) | NOT NULL |
| `period` | varchar(16) | NOT NULL | monthly/quarterly |
| `start_date` / `end_date` | date | |
| `created_at` / `updated_at` | timestamp | |

### 3.8 购物清单
**shopping_lists**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `name` | varchar(128) | NOT NULL |
| `status` | varchar(16) | default 'pending' | pending/partial/completed |
| `remarks` | text | NULL |
| `created_at` / `updated_at` | timestamp | |

**shopping_list_items**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `shopping_list_id` | uuid | FK → shopping_lists(id) |
| `item_id` | uuid | FK → items(id) |
| `suggested_quantity` | numeric(18,2) | NOT NULL |
| `actual_quantity` | numeric(18,2) | NULL |
| `status` | varchar(16) | default 'todo' | todo/done/skipped |
| `created_at` / `updated_at` | timestamp | |

### 3.9 提醒与通知
**notifications**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `item_id` | uuid | FK → items(id), NULL |
| `type` | varchar(32) | NOT NULL | low_stock/expiry/expense |
| `level` | varchar(16) | NOT NULL | info/warning/critical |
| `title` | varchar(128) | NOT NULL |
| `message` | text | NOT NULL |
| `status` | varchar(16) | default 'unread' |
| `created_at` / `updated_at` | timestamp | |

### 3.10 统计表
根据需求生成日/月统计缓存。

**statistics_daily**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `date` | date | NOT NULL |
| `total_expense` | numeric(18,2) | |
| `total_usage` | numeric(18,2) | |
| `low_stock_count` | int | |
| `expiring_count` | int | |
| UNIQUE | (user_id, date) |

### 3.11 操作日志与导入任务
**audit_logs**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `entity` | varchar(64) | NOT NULL | items/purchase_records... |
| `entity_id` | uuid | NULL |
| `action` | varchar(32) | NOT NULL | create/update/delete/confirm |
| `diff` | jsonb | NULL | 变化内容 |
| `created_at` | timestamp | default now() |

**import_tasks**
| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → users(id) |
| `type` | varchar(32) | NOT NULL | items/purchase_records |
| `file_url` | varchar(255) | NOT NULL |
| `status` | varchar(16) | default 'pending' | pending/running/success/failed |
| `result` | jsonb | NULL |
| `created_at` / `updated_at` | timestamp | |

---

## 4. 字段与约束规范
- 所有金额字段使用 `numeric(18,2)`，避免浮点误差。
- 数量字段统一 `numeric(18,2)`，兼容按重量/体积计量。
- 状态字段使用限定枚举（在代码中定义常量）。
- 日期和时间字段使用 `date` 或 `timestamp with time zone`。
- 所有外键均设置 `ON DELETE RESTRICT`，避免意外删除；部分可配置为 `ON DELETE SET NULL`（如默认位置）。
- `created_at`、`updated_at` 字段通过 TypeORM 自动维护。

---

## 5. 索引与性能建议
| 表名 | 索引 | 说明 |
| --- | --- | --- |
| `items` | `idx_items_name` (btree) | 名称搜索 |
| `items` | `idx_items_category` | 分类筛选 |
| `stock` | `idx_stock_item_location` (unique) | 确保唯一组合 |
| `purchase_records` | `idx_purchase_records_date` | 时间查询 |
| `purchase_record_items` | `idx_pr_items_item_id` | 统计频度 |
| `usage_records` | `idx_usage_records_date` | 时间查询 |
| `notifications` | `idx_notifications_user_status` | 用户提醒列表 |
| `statistics_daily` | `idx_statistics_daily_user_date` | 唯一键 |

> 依据实际查询统计监控持续优化。

---

## 6. 数据初始化（种子）
- 角色：admin/member/guest
- 预设分类：食品（日用品/药品/电器/工具…）
- 预设位置：厨房、客厅、卧室、卫生间、储物间
- 预设权限按钮（如后续前端需要）

---

## 7. 数据库迁移策略
- 使用 TypeORM migrations
  - `npm run migration:generate -- <name>`
  - `npm run migration:run`
- 约定：开发阶段可允许 `synchronize: false`
- 生产环境必须通过迁移脚本管理表结构变更
- 每次版本发布前执行迁移，完成后记录版本号

---

## 8. 数据安全与备份
- 定期备份策略：每日增量、每周全量
- 备份文件加密存储（S3/OSS）
- 重要表（users, stock, purchase_records...）支持 Point-in-time recovery
- 定期执行数据一致性检查（库存 vs 调整记录）

---

## 9. 后续扩展建议
- 引入审计字段（例如 `deleted_at` 实现软删除）
- 增加 `families` 表，支持多个家庭共享系统
- 日志与统计表可做冷热分离（历史数据归档）
- 考虑 ElasticSearch 做全文搜索（如物品搜索要求更高）

---

> 文档维护：如表结构变更，请同步更新本文件，确保开发、测试、运维端对齐。
