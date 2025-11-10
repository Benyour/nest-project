# 家庭物品管家系统 API 规格

> 版本：v1.0  
> 对应需求：`docs/requirements.md`  
> 说明：本规格为后端 REST API 概要描述，详细字段以 Swagger（OpenAPI）为准。

---

## 1. 约定与通用规则
- **基础 URL**：`/api/v1`
- **认证方式**：HTTP Header `Authorization: Bearer <token>`（除公开接口外均需）
- **请求格式**：JSON，`Content-Type: application/json`
- **响应格式**：
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "操作成功",
    "timestamp": "2025-01-10T12:00:00Z"
  }
  ```
- **错误响应**：HTTP 状态码 + 业务错误码（`code` 字段）
  ```json
  {
    "success": false,
    "code": "INV-001",
    "message": "库存不足",
    "timestamp": "..."
  }
  ```
- **分页参数**：`page`（默认1）、`limit`（默认10）、`sort`（`field,DESC`）
- **时间格式**：ISO8601（`YYYY-MM-DDTHH:mm:ss.sssZ`），日期字段用 `YYYY-MM-DD`
- **Swagger 地址**：`/api/v1/docs`

---

## 2. 认证与用户
### 2.1 注册
- **POST** `/auth/register`
- Request
  ```json
  {
    "email": "test@example.com",
    "password": "Passw0rd!",
    "name": "张三"
  }
  ```
- Response
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "test@example.com",
      "name": "张三"
    }
  }
  ```

### 2.2 登录
- **POST** `/auth/login`
- Request：`{ "email": "...", "password": "..." }`
- Response：`{ accessToken, refreshToken, expiresIn }`

### 2.3 刷新 Token
- **POST** `/auth/refresh`
- Request：`{ "refreshToken": "..." }`
- Response：新 Access Token

### 2.4 获取当前用户
- **GET** `/auth/me`
- Response：用户信息（含角色、头像等）

---

## 3. 分类与位置
### 3.1 分类
- **GET** `/categories`：列表（支持级联、分页）
- **POST** `/categories`
  ```json
  {
    "name": "食品",
    "parentId": null,
    "sortOrder": 1
  }
  ```
- **PATCH** `/categories/:id`
- **DELETE** `/categories/:id`

### 3.2 位置
- 接口与分类类似：`/locations`
- 支持 `parentId` 建立层级（如厨房 → 橱柜上层）

---

## 4. 物品管理
### 4.1 物品列表
- **GET** `/items`
  - Query：`page, limit, categoryId, keyword, tagIds`
- **GET** `/items/:id`
- **POST** `/items`
  ```json
  {
    "name": "大米",
    "categoryId": "uuid",
    "unit": "kg",
    "brand": "金龙鱼",
    "specification": "5kg",
    "defaultLocationId": "uuid",
    "shelfLifeDays": 180,
    "tagIds": ["uuid1", "uuid2"],
    "remarks": "每月采购"
  }
  ```
- **PATCH** `/items/:id`
- **DELETE** `/items/:id`
- **POST** `/items/:id/attachments`：上传图片（`multipart/form-data`）

### 4.2 标签管理
- **GET** `/tags`
- **POST** `/tags`：`{ "name": "常用" }`
- **DELETE** `/tags/:id`

---

## 5. 库存（物品清单）
### 5.1 当前库存查询
- **GET** `/stock`
  - Query：`itemId, locationId, lowStockOnly`
- Response：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "item": { "id": "...", "name": "大米" },
        "location": { "id": "...", "name": "厨房" },
        "quantity": 8.5,
        "minQuantity": 2,
        "latestPurchaseDate": "2025-01-10",
        "expiryDate": "2025-01-20"
      }
    ]
  }
  ```

### 5.2 创建 / 更新 / 删除
- **POST** `/stock`
  ```json
  {
    "itemId": "uuid",
    "locationId": "uuid",
    "quantity": 10,
    "minQuantity": 2,
    "latestPurchasePrice": 12.5,
    "latestPurchaseDate": "2025-01-01",
    "expiryDate": "2025-02-01",
    "memo": "初始入库"
  }
  ```
- **PATCH** `/stock/:id`
- **DELETE** `/stock/:id`

### 5.3 库存调整与历史
- **POST** `/stock/:id/adjustments`（返回 HTTP 200）
  ```json
  {
    "type": "usage",
    "delta": -1.5,
    "reason": "daily",
    "remarks": "早餐制作",
    "createdById": "uuid"
  }
  ```
- **GET** `/stock/:id/adjustments`：按时间倒序返回调整记录

---

## 6. 采购记录
### 6.1 列表 & 详情
- **GET** `/purchase-records`
- **GET** `/purchase-records/:id`

### 6.2 创建采购记录（草稿）
- **POST** `/purchase-records`
  ```json
  {
    "code": "PO-20250101-001",
    "createdById": "uuid",
    "purchaseDate": "2025-01-15",
    "storeName": "永辉超市",
    "storeType": "offline",
    "remarks": "周末采购",
    "items": [
      {
        "itemId": "uuid",
        "locationId": "uuid",
        "quantity": 5,
        "unitPrice": 2.5,
        "expiryDate": "2025-03-01",
        "remarks": "送的优惠券"
      }
    ]
  }
  ```
- 返回：完整草稿记录（`status = draft`）
- 备注：`code` 唯一；若未指定 `totalPrice` 将自动计算

### 6.3 更新 / 删除
- **PATCH** `/purchase-records/:id`
  - 仅 `draft` 状态可更新，可整体替换明细
- **DELETE** `/purchase-records/:id`
  - 仅 `draft` 状态可删除

### 6.4 确认采购
- **POST** `/purchase-records/:id/confirm`（返回 HTTP 200）
  ```json
  {
    "confirmedById": "uuid",
    "remarks": "已验收入库"
  }
  ```
- 说明：在事务中更新库存，如无库存记录则新建后调整；生成采购类型的库存调整记录

### 6.5 状态说明
- `draft`：草稿，可编辑/删除
- `confirmed`：已确认，库存已更新，禁止修改
- `cancelled`：预留状态，尚未开放

---

## 7. 使用记录
（结构类似采购记录）
- **GET** `/usage-records`
- **GET** `/usage-records/:id`
- **POST** `/usage-records`
  ```json
  {
    "usageDate": "2025-01-20",
    "type": "daily",
    "remarks": "日常使用",
    "items": [
      {
        "itemId": "uuid",
        "locationId": "uuid",
        "quantity": 1.5,
        "remarks": "做饭"
      }
    ]
  }
  ```
- **PATCH** `/usage-records/:id/confirm`
- **PATCH** `/usage-records/:id/cancel`

---

## 8. 购物清单
- **GET** `/shopping-lists`
- **GET** `/shopping-lists/:id`
- **POST** `/shopping-lists`
  ```json
  {
    "name": "周末采购清单",
    "items": [
      { "itemId": "uuid", "suggestedQuantity": 3 }
    ],
    "remarks": "自动生成的清单"
  }
  ```
- **PATCH** `/shopping-lists/:id`
- **DELETE** `/shopping-lists/:id`
- **POST** `/shopping-lists/:id/items/:itemId/complete`：标记已购买

---

## 9. 商店管理
- **GET** `/stores`
- **POST** `/stores`
  ```json
  {
    "name": "永辉超市",
    "type": "offline",
    "contact": "张经理",
    "phone": "010-12345678",
    "address": "北京市..."
  }
  ```
- **PATCH** `/stores/:id`
- **DELETE** `/stores/:id`

---

## 10. 提醒与通知
### 10.1 提醒列表
- **GET** `/notifications`
  - Query：`type, status`
- Response：
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "type": "low_stock",
        "level": "warning",
        "title": "快用完了",
        "message": "大米库存少于 2kg",
        "status": "unread",
        "createdAt": "2025-01-21T09:00:00Z"
      }
    ]
  }
  ```

### 10.2 设置提醒为已读
- **PATCH** `/notifications/:id/read`

### 10.3 批量处理
- **POST** `/notifications/read`
  ```json
  { "ids": ["uuid1", "uuid2"] }
  ```

---

## 11. 仪表盘 & 统计
### 11.1 仪表盘
- **GET** `/dashboard`
  - Response
    ```json
    {
      "data": {
        "totalItems": 42,
        "lowStockCount": 3,
        "expiringCount": 2,
        "monthlyExpense": 560.5,
        "inventoryValue": 3200.8,
        "pendingNotifications": 5,
        "charts": {
          "monthlyExpense": [...],
          "categoryDistribution": [...]
        }
      }
    }
    ```

### 11.2 消费统计
- **GET** `/statistics/expense`
  - Query：`startDate, endDate, groupBy=month/category/store`

### 11.3 物品使用分析
- **GET** `/statistics/usage`

### 11.4 库存分析
- **GET** `/statistics/inventory`

---

## 12. 整理核对（盘点）
- **GET** `/stock-audits`
- **POST** `/stock-audits`
  ```json
  {
    "name": "厨房年度盘点",
    "locations": ["uuid"],
    "items": ["uuid"],
    "remarks": "春节前盘点"
  }
  ```
- **GET** `/stock-audits/:id`
- **POST** `/stock-audits/:id/submit`
  ```json
  {
    "items": [
      {
        "stockId": "uuid",
        "quantityActual": 5,
        "remarks": "实物为 5kg"
      }
    ]
  }
  ```
- **POST** `/stock-audits/:id/confirm`：应用差异、生成调整记录

---

## 13. 文件导入导出
- **POST** `/imports/items`：上传 Excel（`multipart/form-data`）
- **GET** `/exports/items`：导出 Excel/CSV
- **GET** `/imports/:id/status`：查询导入任务状态

---

## 14. 系统管理
- **GET** `/settings`：读取系统配置（提醒提前天数、阈值）
- **PATCH** `/settings`：更新配置
- **GET** `/health`：健康检查（数据库、Redis、MQ 状态）

---

## 15. WebSocket 事件（概览）
| 事件 | 方向 | 说明 |
| --- | --- | --- |
| `notifications.lowStock` | 服务端 → 客户端 | 低库存提醒推送 |
| `notifications.expiry` | 服务端 → 客户端 | 快过期提醒推送 |
| `shoppingList.updated` | 服务端 → 客户端 | 购物清单变更 |
| `stock.updated` | 服务端 → 客户端 | 库存数量变化 |

---

## 16. 错误码示例
| 业务场景 | 错误码 | HTTP 状态 | 描述 |
| --- | --- | --- | --- |
| 认证失败 | `AUTH-001` | 401 | 用户不存在或密码错误 |
| Token 过期 | `AUTH-002` | 401 | Access Token 失效 |
| 权限不足 | `AUTH-003` | 403 | 当前用户无权限 |
| 物品不存在 | `ITEM-404` | 404 | 指定物品不存在 |
| 库存不足 | `STOCK-001` | 400 | 库存数量不足 |
| 状态非法 | `PROC-002` | 400 | 当前状态不允许操作 |
| 导入失败 | `IMPORT-001` | 500 | Excel 解析失败 |

---

> 备注：实际接口细节、字段、示例、错误码请以 Swagger 文档与实现代码为准。
