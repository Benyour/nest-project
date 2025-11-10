# NestJS 高级特性映射文档

本文档详细说明本项目如何涵盖NestJS的所有高级特性，以及每个特性对应的技术实现和应用场景。

---

## 1. 核心架构特性

### 1.1 模块化架构 (Modules)
**技术**：`@Module()` 装饰器、模块导入导出  
**应用场景**：
- ✅ 业务模块拆分：`ItemsModule`、`StockModule`、`PurchaseRecordsModule`、`UsageRecordsModule`
- ✅ 共享模块：`CommonModule`（公共装饰器、管道、过滤器）
- ✅ 配置模块：`ConfigModule`（全局配置）
- ✅ 数据库模块：`TypeOrmModule`（数据库连接）

**代码示例**：
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Item, Stock])],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService], // 导出供其他模块使用
})
export class ItemsModule {}
```

---

### 1.2 依赖注入 (Dependency Injection)
**技术**：`@Injectable()`、构造函数注入、属性注入  
**应用场景**：
- ✅ Service层注入Repository
- ✅ Controller注入Service
- ✅ Service注入其他Service（如`StockService`注入`ItemsService`）
- ✅ 注入配置服务（`ConfigService`）
- ✅ 注入数据源（`DataSource`用于事务）

**代码示例**：
```typescript
@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly itemsService: ItemsService, // 注入其他Service
    private readonly configService: ConfigService, // 注入配置
    private readonly dataSource: DataSource, // 注入数据源
  ) {}
}
```

---

### 1.3 自定义提供者 (Custom Providers)
**技术**：`useFactory`、`useClass`、`useValue`、`useExisting`  
**应用场景**：
- ✅ 动态配置提供者（根据环境变量创建不同实例）
- ✅ 第三方库封装（如Redis、RabbitMQ客户端）
- ✅ 策略模式实现（不同支付方式、不同通知渠道）

**代码示例**：
```typescript
// 动态Redis配置
{
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new Redis(configService.get('REDIS_URL'));
  },
  inject: [ConfigService],
}

// 策略模式：通知服务
{
  provide: 'NOTIFICATION_SERVICE',
  useFactory: (configService: ConfigService) => {
    const type = configService.get('NOTIFICATION_TYPE');
    return type === 'email' ? new EmailService() : new SmsService();
  },
  inject: [ConfigService],
}
```

---

### 1.4 动态模块 (Dynamic Modules)
**技术**：`forRoot()`、`forRootAsync()`、`forFeature()`  
**应用场景**：
- ✅ TypeORM动态模块（`TypeOrmModule.forRootAsync()`）
- ✅ ConfigModule动态配置（`ConfigModule.forRoot()`）
- ✅ 自定义动态模块（如`CacheModule.forRoot()`）

**代码示例**：
```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        // ... 动态配置
      }),
    }),
  ],
})
export class AppModule {}
```

---

### 1.5 模块引用 (Module References)
**技术**：`forwardRef()`、循环依赖处理  
**应用场景**：
- ✅ 处理模块间的循环依赖
- ✅ 延迟加载模块

**代码示例**：
```typescript
@Module({
  imports: [
    forwardRef(() => StockModule), // 处理循环依赖
  ],
})
export class ItemsModule {}
```

---

## 2. 请求处理管道

### 2.1 管道 (Pipes)
**技术**：`@UsePipes()`、`ValidationPipe`、自定义管道  
**应用场景**：
- ✅ 数据验证：DTO验证（`class-validator`）
- ✅ 数据转换：类型转换、格式转换
- ✅ 自定义验证：业务规则验证（如物品名称唯一性）

**代码示例**：
```typescript
// 全局验证管道
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));

// 自定义管道：物品名称验证
@Injectable()
export class ItemNamePipe implements PipeTransform {
  async transform(value: string) {
    // 检查物品名称是否已存在
    const exists = await this.itemsService.existsByName(value);
    if (exists) {
      throw new ConflictException('物品名称已存在');
    }
    return value;
  }
}
```

---

### 2.2 守卫 (Guards)
**技术**：`@UseGuards()`、`CanActivate`、`@SetMetadata()`  
**应用场景**：
- ✅ 认证守卫：JWT Token验证
- ✅ 授权守卫：RBAC权限控制
- ✅ 角色守卫：基于角色的访问控制
- ✅ 资源权限守卫：检查用户是否有权限操作特定资源

**代码示例**：
```typescript
// JWT认证守卫
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return this.validateToken(request.headers.authorization);
  }
}

// 角色守卫
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// 使用
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'member')
@Get('items')
async getItems() {}
```

---

### 2.3 拦截器 (Interceptors)
**技术**：`@UseInterceptors()`、`@Injectable()`、`NestInterceptor`  
**应用场景**：
- ✅ 日志拦截器：记录请求和响应
- ✅ 性能监控拦截器：记录响应时间
- ✅ 缓存拦截器：自动缓存响应
- ✅ 响应转换拦截器：统一响应格式
- ✅ 异常拦截器：统一异常处理

**代码示例**：
```typescript
// 日志拦截器
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.logger.log(`${method} ${url} ${response.statusCode} - ${delay}ms`);
      }),
    );
  }
}

// 响应转换拦截器
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// 缓存拦截器
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheManager: Cache) {}
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const key = this.generateCacheKey(context);
    const cached = await this.cacheManager.get(key);
    
    if (cached) {
      return of(cached);
    }
    
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheManager.set(key, data, { ttl: 300 });
      }),
    );
  }
}
```

---

### 2.4 异常过滤器 (Exception Filters)
**技术**：`@Catch()`、`ExceptionFilter`、`@UseFilters()`  
**应用场景**：
- ✅ 统一异常处理：格式化错误响应
- ✅ 业务异常处理：自定义业务异常
- ✅ HTTP异常处理：404、400、500等
- ✅ 数据库异常处理：TypeORM异常转换

**代码示例**：
```typescript
// 全局异常过滤器
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : '服务器内部错误';
    
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}

// 业务异常
export class ItemNotFoundException extends NotFoundException {
  constructor(itemId: string) {
    super(`物品 ${itemId} 不存在`);
  }
}

// 使用
@Catch(ItemNotFoundException)
export class ItemExceptionFilter implements ExceptionFilter {
  catch(exception: ItemNotFoundException, host: ArgumentsHost) {
    // 自定义处理逻辑
  }
}
```

---

### 2.5 中间件 (Middleware)
**技术**：`@Injectable()`、`NestMiddleware`、`app.use()`  
**应用场景**：
- ✅ 请求日志中间件：记录所有请求
- ✅ CORS中间件：跨域处理
- ✅ 请求ID中间件：为每个请求生成唯一ID
- ✅ 限流中间件：API限流

**代码示例**：
```typescript
// 请求日志中间件
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, url } = req;
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`${method} ${url} ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  }
}

// 请求ID中间件
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  }
}

// 注册
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, RequestIdMiddleware)
      .forRoutes('*');
  }
}
```

---

## 3. 自定义装饰器

### 3.1 参数装饰器 (Parameter Decorators)
**技术**：`createParamDecorator()`  
**应用场景**：
- ✅ 获取当前用户：`@CurrentUser()`
- ✅ 获取请求ID：`@RequestId()`
- ✅ 获取分页参数：`@Pagination()`
- ✅ 获取查询参数：`@QueryParam()`

**代码示例**：
```typescript
// 当前用户装饰器
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// 分页参数装饰器
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    return { page, limit, skip: (page - 1) * limit };
  },
);

// 使用
@Get('items')
async getItems(@Pagination() pagination: PaginationDto, @CurrentUser() user: User) {
  return this.itemsService.findAll(pagination, user);
}
```

---

### 3.2 方法装饰器 (Method Decorators)
**技术**：`SetMetadata()`、`Reflector`  
**应用场景**：
- ✅ 权限装饰器：`@Roles()`、`@Permissions()`
- ✅ 缓存装饰器：`@Cache()`
- ✅ 限流装饰器：`@Throttle()`
- ✅ 公开路由装饰器：`@Public()`

**代码示例**：
```typescript
// 角色装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 权限装饰器
export const Permissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// 公开路由装饰器
export const Public = () => SetMetadata('isPublic', true);

// 缓存装饰器
export const Cache = (ttl: number = 300) => SetMetadata('cache', ttl);

// 使用
@Get('items')
@Roles('admin', 'member')
@Permissions('items:read')
@Cache(600)
async getItems() {}
```

---

### 3.3 类装饰器 (Class Decorators)
**技术**：自定义类装饰器  
**应用场景**：
- ✅ API版本装饰器：`@ApiVersion()`
- ✅ 控制器前缀装饰器：`@ControllerPrefix()`

**代码示例**：
```typescript
export const ApiVersion = (version: string) => 
  SetMetadata('apiVersion', version);

@ApiVersion('v1')
@Controller('items')
export class ItemsController {}
```

---

## 4. 数据库集成

### 4.1 TypeORM集成
**技术**：`@nestjs/typeorm`、`@Entity()`、`@Repository()`  
**应用场景**：
- ✅ 实体定义：`Item`、`Stock`、`PurchaseRecord`等
- ✅ Repository注入：`@InjectRepository()`
- ✅ 关系映射：`@OneToMany`、`@ManyToOne`、`@OneToOne`
- ✅ 数据库迁移：Migration文件

**代码示例**：
```typescript
@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @ManyToOne(() => Category)
  category: Category;
  
  @OneToMany(() => Stock, stock => stock.item)
  stocks: Stock[];
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}
}
```

---

### 4.2 数据库事务
**技术**：`DataSource.transaction()`、`@Transactional()`  
**应用场景**：
- ✅ 购买记录确认：更新记录状态 + 更新物品数量
- ✅ 使用记录确认：更新记录状态 + 扣减物品数量
- ✅ 批量操作：确保数据一致性

**代码示例**：
```typescript
async confirmPurchaseRecord(recordId: string) {
  return this.dataSource.transaction(async (manager) => {
    const recordRepo = manager.getRepository(PurchaseRecord);
    const stockRepo = manager.getRepository(Stock);
    
    // 1. 更新记录状态
    await recordRepo.update(recordId, { status: 'confirmed' });
    
    // 2. 更新物品数量
    const record = await recordRepo.findOne({ where: { id: recordId }, relations: ['items'] });
    for (const item of record.items) {
      await stockRepo.increment(
        { itemId: item.itemId, locationId: item.locationId },
        'quantity',
        item.quantity,
      );
    }
    
    return record;
  });
}
```

---

### 4.3 数据库迁移
**技术**：TypeORM Migrations  
**应用场景**：
- ✅ 数据库结构变更
- ✅ 数据迁移
- ✅ 索引创建

**代码示例**：
```typescript
// migration文件
export class CreateItemsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          // ...
        ],
      }),
    );
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('items');
  }
}
```

---

### 4.4 查询构建器
**技术**：`QueryBuilder`、`createQueryBuilder()`  
**应用场景**：
- ✅ 复杂查询：多表关联、条件查询
- ✅ 聚合查询：统计、分组
- ✅ 性能优化：只查询需要的字段

**代码示例**：
```typescript
async findLowStockItems(userId: string) {
  return this.stockRepository
    .createQueryBuilder('stock')
    .leftJoinAndSelect('stock.item', 'item')
    .leftJoinAndSelect('stock.location', 'location')
    .where('stock.quantity <= stock.minQuantity')
    .andWhere('stock.userId = :userId', { userId })
    .orderBy('stock.quantity', 'ASC')
    .getMany();
}
```

---

## 5. 认证授权

### 5.1 JWT认证
**技术**：`@nestjs/jwt`、`Passport`、`passport-jwt`  
**应用场景**：
- ✅ 用户登录：生成Access Token和Refresh Token
- ✅ Token验证：JWT Guard验证Token
- ✅ Token刷新：Refresh Token机制

**代码示例**：
```typescript
// JWT策略
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }
  
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}

// 登录服务
@Injectable()
export class AuthService {
  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

---

### 5.2 RBAC权限控制
**技术**：自定义Guard、`@SetMetadata()`  
**应用场景**：
- ✅ 角色控制：管理员、成员、访客
- ✅ 权限控制：细粒度权限（如`items:create`、`items:read`）
- ✅ 资源权限：检查用户是否有权限操作特定资源

**代码示例**：
```typescript
// 权限Guard
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const user = context.switchToHttp().getRequest().user;
    return requiredPermissions.some(permission => 
      user.permissions?.includes(permission)
    );
  }
}

// 使用
@Post('items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('items:create')
async createItem(@Body() dto: CreateItemDto) {}
```

---

## 6. 缓存

### 6.1 Redis缓存
**技术**：`@nestjs/cache-manager`、`cache-manager-redis-store`  
**应用场景**：
- ✅ 查询结果缓存：物品列表、统计信息
- ✅ 会话存储：用户会话
- ✅ 分布式锁：防止并发问题
- ✅ 限流计数器：API限流

**代码示例**：
```typescript
// 缓存服务
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  
  async get<T>(key: string): Promise<T> {
    return this.cacheManager.get(key);
  }
  
  async set(key: string, value: any, ttl?: number) {
    await this.cacheManager.set(key, value, ttl);
  }
  
  async del(key: string) {
    await this.cacheManager.del(key);
  }
}

// 使用
@Get('items')
@UseInterceptors(CacheInterceptor)
@CacheTTL(300)
async getItems() {
  return this.itemsService.findAll();
}
```

---

### 6.2 缓存装饰器
**技术**：自定义拦截器、装饰器  
**应用场景**：
- ✅ 方法级缓存：`@Cache()`
- ✅ 缓存失效：更新时清除缓存

**代码示例**：
```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.generateCacheKey(context);
    const cached = await this.cacheManager.get(cacheKey);
    
    if (cached) {
      return of(cached);
    }
    
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheManager.set(cacheKey, data, { ttl: 300 });
      }),
    );
  }
}
```

---

## 7. 消息队列

### 7.1 RabbitMQ集成
**技术**：`@nestjs/microservices`、`amqplib`  
**应用场景**：
- ✅ 异步任务：过期提醒检查、数据统计
- ✅ 事件发布：物品创建、数量更新
- ✅ 通知发送：邮件、短信通知

**代码示例**：
```typescript
// 消息生产者
@Injectable()
export class MessageProducer {
  constructor(@Inject('RABBITMQ_CONNECTION') private connection: Connection) {}
  
  async publishEvent(event: string, data: any) {
    const channel = await this.connection.createChannel();
    await channel.assertQueue('events', { durable: true });
    await channel.sendToQueue('events', Buffer.from(JSON.stringify({ event, data })));
  }
}

// 消息消费者
@Injectable()
export class MessageConsumer {
  @RabbitSubscribe({
    exchange: 'events',
    routingKey: 'item.created',
    queue: 'item-created-queue',
  })
  async handleItemCreated(data: any) {
    // 处理物品创建事件
    await this.notificationService.sendLowStockAlert(data);
  }
}
```

---

## 8. WebSocket

### 8.1 WebSocket网关
**技术**：`@nestjs/websockets`、`@WebSocketGateway()`  
**应用场景**：
- ✅ 实时通知：物品数量变化、过期提醒
- ✅ 多用户协作：实时同步操作
- ✅ 在线状态：显示在线用户

**代码示例**：
```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;
  
  sendLowStockAlert(userId: string, items: Item[]) {
    this.server.to(`user-${userId}`).emit('lowStockAlert', items);
  }
  
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
  }
}
```

---

## 9. 文件处理

### 9.1 文件上传
**技术**：`@nestjs/platform-express`、`multer`  
**应用场景**：
- ✅ 物品图片上传
- ✅ Excel文件导入
- ✅ 文件验证和存储

**代码示例**：
```typescript
@Post('items/:id/upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('只支持图片文件'), false);
    }
  },
}))
async uploadImage(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // 上传到OSS/S3
  const url = await this.fileService.uploadToOSS(file);
  await this.itemsService.update(id, { imageUrl: url });
  return { url };
}
```

---

## 10. 定时任务

### 10.1 Cron任务
**技术**：`@nestjs/schedule`、`@Cron()`  
**应用场景**：
- ✅ 过期提醒检查：每天检查
- ✅ 低库存提醒：每小时检查
- ✅ 数据统计：每天凌晨
- ✅ 数据备份：每周

**代码示例**：
```typescript
@Injectable()
export class ScheduledTasks {
  constructor(
    private readonly stockService: StockService,
    private readonly notificationService: NotificationService,
  ) {}
  
  @Cron('0 0 9 * * *') // 每天9点
  async checkExpiryItems() {
    const expiringItems = await this.stockService.findExpiringItems(7);
    for (const item of expiringItems) {
      await this.notificationService.sendExpiryAlert(item);
    }
  }
  
  @Cron('0 * * * * *') // 每小时
  async checkLowStock() {
    const lowStockItems = await this.stockService.findLowStockItems();
    // 发送提醒
  }
}
```

---

## 11. 测试

### 11.1 单元测试
**技术**：`@nestjs/testing`、`Jest`  
**应用场景**：
- ✅ Service层测试：业务逻辑测试
- ✅ Controller层测试：API测试
- ✅ Mock和Stub：模拟依赖

**代码示例**：
```typescript
describe('ItemsService', () => {
  let service: ItemsService;
  let repository: Repository<Item>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(Item),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();
    
    service = module.get<ItemsService>(ItemsService);
    repository = module.get<Repository<Item>>(getRepositoryToken(Item));
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  it('should create an item', async () => {
    const dto = { name: 'Test Item', categoryId: '1' };
    const item = { id: '1', ...dto };
    
    jest.spyOn(repository, 'create').mockReturnValue(item as any);
    jest.spyOn(repository, 'save').mockResolvedValue(item as any);
    
    const result = await service.create(dto);
    expect(result).toEqual(item);
  });
});
```

---

### 11.2 E2E测试
**技术**：`supertest`、`Test.createTestingModule()`  
**应用场景**：
- ✅ API端点测试：完整请求响应测试
- ✅ 数据库集成测试：真实数据库操作

**代码示例**：
```typescript
describe('ItemsController (e2e)', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  
  it('/items (POST)', () => {
    return request(app.getHttpServer())
      .post('/items')
      .send({ name: 'Test Item', categoryId: '1' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.name).toBe('Test Item');
      });
  });
});
```

---

## 12. 配置管理

### 12.1 环境配置
**技术**：`@nestjs/config`、`ConfigModule`  
**应用场景**：
- ✅ 环境变量管理：开发、测试、生产环境
- ✅ 配置验证：确保配置完整
- ✅ 配置模块：数据库、Redis、JWT等配置

**代码示例**：
```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
});

// 使用
@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {
    const dbUrl = this.configService.get<string>('database.url');
  }
}
```

---

## 13. 日志系统

### 13.1 结构化日志
**技术**：`Winston`、`Pino`、自定义Logger  
**应用场景**：
- ✅ 请求日志：记录所有API请求
- ✅ 错误日志：记录异常信息
- ✅ 业务日志：记录关键操作

**代码示例**：
```typescript
// 自定义Logger
import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class AppLogger implements LoggerService {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }
  
  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }
  
  error(message: string, trace: string, context?: string) {
    this.logger.error(message, { trace, context });
  }
}
```

---

## 14. 健康检查

### 14.1 健康检查端点
**技术**：`@nestjs/terminus`  
**应用场景**：
- ✅ 服务健康检查：数据库、Redis连接状态
- ✅ 就绪检查：服务是否就绪
- ✅ 存活检查：服务是否存活

**代码示例**：
```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}
  
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

---

## 15. API文档

### 15.1 Swagger集成
**技术**：`@nestjs/swagger`、`@ApiTags()`、`@ApiOperation()`  
**应用场景**：
- ✅ API文档生成：自动生成OpenAPI文档
- ✅ 接口测试：Swagger UI在线测试
- ✅ 数据模型文档：DTO文档

**代码示例**：
```typescript
@ApiTags('物品管理')
@Controller('items')
export class ItemsController {
  @Post()
  @ApiOperation({ summary: '创建物品' })
  @ApiCreatedResponse({ type: Item })
  @ApiBadRequestResponse({ description: '参数错误' })
  async create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }
}
```

---

## 16. 微服务架构（可选）

### 16.1 微服务通信
**技术**：`@nestjs/microservices`、gRPC、消息队列  
**应用场景**：
- ✅ 服务拆分：物品服务、库存服务、通知服务
- ✅ 服务通信：HTTP、gRPC、消息队列
- ✅ 服务发现：服务注册与发现

**代码示例**：
```typescript
// 微服务客户端
@Injectable()
export class NotificationClient {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private client: ClientProxy,
  ) {}
  
  sendNotification(data: any) {
    return this.client.send('notification.send', data).toPromise();
  }
}
```

---

## 17. 性能优化

### 17.1 压缩和缓存
**技术**：`compression`、`helmet`  
**应用场景**：
- ✅ 响应压缩：Gzip压缩
- ✅ 安全头：Helmet安全头
- ✅ 静态资源：CDN加速

**代码示例**：
```typescript
// main.ts
import * as compression from 'compression';
import helmet from 'helmet';

app.use(helmet());
app.use(compression());
```

---

## 总结

本项目涵盖了NestJS的所有高级特性，每个特性都有明确的应用场景和技术实现。通过这个项目，可以全面掌握：

1. ✅ **核心架构**：模块化、依赖注入、动态模块
2. ✅ **请求处理**：管道、守卫、拦截器、异常过滤器、中间件
3. ✅ **自定义装饰器**：参数、方法、类装饰器
4. ✅ **数据库**：TypeORM、事务、迁移、查询构建器
5. ✅ **认证授权**：JWT、RBAC
6. ✅ **缓存**：Redis、缓存装饰器
7. ✅ **消息队列**：RabbitMQ
8. ✅ **WebSocket**：实时通信
9. ✅ **文件处理**：文件上传下载
10. ✅ **定时任务**：Cron任务
11. ✅ **测试**：单元测试、E2E测试
12. ✅ **配置管理**：环境配置
13. ✅ **日志系统**：结构化日志
14. ✅ **健康检查**：服务监控
15. ✅ **API文档**：Swagger
16. ✅ **微服务**：服务拆分和通信
17. ✅ **性能优化**：压缩、缓存

每个特性都有实际的应用场景，不是为了用而用，而是真正解决业务问题！

