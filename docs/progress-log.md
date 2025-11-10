# 项目进度日志

- **当前阶段**：M1 Day1（认证模块-注册/登录）
- **整体进度**：约 15%

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
