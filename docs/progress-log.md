# 项目进度日志

- **当前阶段**：M1 Day4（库存/采购记录）
- **整体进度**：约 55%

## 2025-11-10
- [M0 Day1] 新增 `src/config/configuration.ts`，集中管理环境变量，读取数据库、JWT、Redis、RabbitMQ 配置
- [M0 Day1] 更新 `AppModule`，引入自定义配置、加载 `UsersModule`，并通过 ConfigService 读取数据库连接参数（支持 `DATABASE_SYNCHRONIZE` 等开关）
- [M0 Day1] 创建用户领域基础结构：
  - `src/modules/users/users.module.ts`
  - `src/modules/users/entities/user.entity.ts`
  - `src/modules/users/users.service.ts`
  - `src/modules/users/users.controller.ts`
- 用户表结构包含：`email`(唯一)、`password`、`name`、`status`、`avatarUrl`、时间戳等；控制器提供临时的 `/users` GET 接口用于调试
- [M0 Day2] 新增全局请求日志中间件 `RequestLoggerMiddleware`，输出 method/url/status/duration
- [M0 Day2] 新增全局异常过滤器 `HttpExceptionFilter`，统一错误结构，打印详细日志
- [M0 Day2] 新增响应包装拦截器 `TransformInterceptor`，统一添加 `success/message/timestamp`
- [M0 Day2] 在 `main.ts` 注册上述中间件/过滤器/拦截器，准备为后续模块提供统一的基础设施
- [M1 Day1] 安装 bcrypt、@nestjs/passport、@nestjs/jwt 等依赖，为认证模块做准备
- [M1 Day1] 扩展 `UsersService`，新增 `create`、`findById`，支持密码加密与邮箱重复校验
- [M1 Day1] 新增认证模块：
  - `src/modules/auth/auth.module.ts`
  - `src/modules/auth/auth.service.ts`
  - `src/modules/auth/auth.controller.ts`
  - DTO（注册、登录）、JWT 策略、守卫、CurrentUser 装饰器
- [M1 Day1] 在 `AppModule` 中引入 `AuthModule`，`npm run build` 通过，验证编译无误
- [M1 Day1] 新增 e2e 测试 `test/auth.e2e-spec.ts`，覆盖注册→登录→获取当前用户流程，`npm run test:e2e` 全部通过
- [M1 Day2] 新增分类领域：实体、DTO、Service、Controller 及 `CategoriesModule`，支持父子层级、排序、Swagger 文档描述，禁止删除含子分类
- [M1 Day2] 新增位置领域：实体、DTO、Service、Controller 及 `LocationsModule`，支持父子层级、描述、排序，沿用删除前的子节点校验
- [M1 Day2] 更新 `AppModule` 注册分类与位置模块，进而在全局 TypeORM 注册中自动加载实体
- [M1 Day2] 编写 `CategoriesService`、`LocationsService` 单元测试，覆盖父子解析、自引用校验、阻止删除含子节点等关键分支
- [M1 Day2] 新增 `test/categories.e2e-spec.ts`、`test/locations.e2e-spec.ts`，验证 REST 接口的创建/查询/删除流程及错误返回结构
- [M1 Day2] 执行 `npm run lint`、`npm run test`、`npm run test:e2e`，确保新增模块在单元与端到端维度全部通过
- [M1 Day3] 新增物品领域：`Item` 实体、创建/更新/列表 DTO、`ItemsService` 与 `ItemsController`，支持分类与默认位置关联、编码唯一校验、关键字过滤
- [M1 Day3] 将 `ItemsModule` 纳入 `AppModule`，并在 `docs` 中更新阶段进度
- [M1 Day3] 编写 `ItemsService` 单元测试，覆盖编码重复、分类缺失、更新逻辑等场景；新增 `test/items.e2e-spec.ts` 验证完整 REST 流程
- [M1 Day3] 执行 `npm run lint`、`npm run test`、`npm run test:e2e`，确认物品模块在单元与端到端层面通过
- [M1 Day4] 完成库存模块重构：`StockService` 支持事务内调用、操作者用户外键、低库存筛选；`StockController` 提供列表/详情/调整/历史接口并以 200 返回状态；补齐 `stock.service.spec.ts` 与 `test/stock.e2e-spec.ts`
- [M1 Day4] 新增采购记录模块：`PurchaseRecord`/`PurchaseRecordItem` 实体、DTO、Service、Controller，确认采购时组合事务更新库存；新增 Service 单测与 `test/purchase-records.e2e-spec.ts` 验证整体流程
- [M1 Day4] 调整 `AppModule` 引入 `PurchaseRecordsModule`，多次执行 `npm run lint`、`npm run test`、`npm run test:e2e`，所有测试通过
g