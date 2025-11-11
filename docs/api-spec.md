# 家庭物品管家系统 API 规格（与当前实现对齐）

> 版本：v1.0  
> 对应需求：`docs/requirements.md`  
> 更新日期：2025-11-10  
> 说明：本文档同步至最新代码实现，描述现有后端 REST API。即将开发或规划中的接口请参考需求文档与产品规划。

---

## 1. 约定与通用规则
- **基础 URL**：`/`（当前服务未设置全局前缀）
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
- **Swagger 地址**：`/docs`

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

### 2.3 获取当前用户
- **GET** `/auth/me`
- Response：用户信息（含角色、头像等）

> **说明**：当前实现尚未提供 Refresh Token 接口；如需新增请在后续迭代中补充。

---

## 3. 分类与位置
### 3.1 分类
- **GET** `/categories`：返回完整树结构（不分页）
- **GET** `/categories/:id`：分类详情
- **POST** `/categories`
  ```json
  {
    "name": "食品",
    "parentId": null,
    "sortOrder": 1
  }
  ```
- **PATCH** `/categories/:id`
- **DELETE** `/categories/:id`（若存在子分类将返回 400）

### 3.2 位置
- **GET** `/locations`：返回完整树结构（不分页）
- **GET** `/locations/:id`：位置详情
- **POST** `/locations`
- **PATCH** `/locations/:id`
- **DELETE** `/locations/:id`（若存在子位置将返回 400）

---

## 4. 物品管理
### 4.1 物品
- **GET** `/items`
  - Query：`page, limit, categoryId, locationId, keyword`
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

> **说明**：附件上传等扩展接口暂未实现；标签已提供完整 CRUD 与筛选能力。

### 4.2 标签
- **GET** `/tags`（可选 `keyword` 模糊搜索）
- **GET** `/tags/:id`
- **POST** `/tags`
  ```json
  { "name": "常用" }
  ```
- **PATCH** `/tags/:id`
- **DELETE** `/tags/:id`

> **与物品的关联**：创建/更新物品时可传 `tagIds` 数组设置关联；查询物品时可通过 `tagIds` 筛选。

---

## 5. 库存
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
- **PATCH** `/usage-records/:id`
- **DELETE** `/usage-records/:id`
- **POST** `/usage-records/:id/confirm`（返回 HTTP 200）

> **说明**：当前版本尚未实现取消使用记录的接口；如需恢复库存请通过库存调整接口处理。

---

## 8. 用户调试接口
- **GET** `/users`：返回所有用户（临时调试用途，生产环境建议移除或加权限）

---

## 9. 系统根路径（调试）
- **GET** `/`：返回健康测试字符串
- **GET** `/zhang`：返回调试信息

> **说明**：以上两个接口用于早期功能验证，生产环境可考虑关闭或改为健康检查。

---

## 10. 错误码示例
| 业务场景 | 错误码 | HTTP 状态 | 描述 |
| --- | --- | --- | --- |
| 认证失败 | `AUTH-001` | 401 | 用户不存在或密码错误 |
| Token 过期 | `AUTH-002` | 401 | Access Token 失效 |
| 权限不足 | `AUTH-003` | 403 | 当前用户无权限 |
| 物品不存在 | `ITEM-404` | 404 | 指定物品不存在 |
| 库存不足 | `STOCK-001` | 400 | 库存数量不足 |
| 状态非法 | `PROC-002` | 400 | 当前状态不允许操作 |

---

> 备注：  
> - 当前版本仅实现上述接口，其余规划功能（标签、购物清单、通知、仪表盘等）仍在需求阶段。  
> - 实际字段与示例以 Swagger 文档与实现代码为准。  
> - 新增接口或行为变更后，请同步更新本文档。
