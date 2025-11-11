import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Item } from '../src/modules/items/entities/item.entity';
import { ItemsModule } from '../src/modules/items/items.module';
import { Location } from '../src/modules/locations/entities/location.entity';
import { LocationsModule } from '../src/modules/locations/locations.module';
import { UsageRecordItem } from '../src/modules/usage-records/entities/usage-record-item.entity';
import { UsageRecord } from '../src/modules/usage-records/entities/usage-record.entity';
import { UsageRecordsModule } from '../src/modules/usage-records/usage-records.module';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockAdjustment } from '../src/modules/stock/entities/stock-adjustment.entity';
import { StockModule } from '../src/modules/stock/stock.module';
import { User, UserStatus } from '../src/modules/users/entities/user.entity';
import { UsersModule } from '../src/modules/users/users.module';
import { Tag } from '../src/modules/tags/entities/tag.entity';

type SupertestTarget = Parameters<typeof request>[0];
type SupertestAgent = ReturnType<typeof request.agent>;

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: unknown;
  timestamp: string;
};

type UsageRecordPayload = {
  id: string;
  status: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
};

describe('UsageRecords (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;
  let user: User;
  let category: Category;
  let location: Location;
  let item: Item;
  let stock: Stock;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            Category,
            Location,
            Item,
            Tag,
            Stock,
            StockAdjustment,
            UsageRecord,
            UsageRecordItem,
          ],
          synchronize: true,
        }),
        UsersModule,
        LocationsModule,
        ItemsModule,
        StockModule,
        UsageRecordsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const server = app.getHttpServer() as SupertestTarget;
    agent = request.agent(server);

    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const categoryRepository = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const locationRepository = app.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    const itemRepository = app.get<Repository<Item>>(getRepositoryToken(Item));
    const stockRepository = app.get<Repository<Stock>>(
      getRepositoryToken(Stock),
    );

    user = await userRepository.save(
      userRepository.create({
        email: 'usage-e2e@example.com',
        password: 'hashed',
        name: '使用记录 E2E',
        status: UserStatus.ACTIVE,
      }),
    );

    category = await categoryRepository.save(
      categoryRepository.create({ name: '食品', sortOrder: 0 }),
    );

    location = await locationRepository.save(
      locationRepository.create({ name: '厨房', sortOrder: 0 }),
    );

    item = await itemRepository.save(
      itemRepository.create({
        name: '盒装牛奶',
        category,
        unit: '盒',
        defaultLocation: location,
      }),
    );

    stock = await stockRepository.save(
      stockRepository.create({
        item,
        location,
        quantity: 6,
        minQuantity: 1,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create draft usage record, confirm and deduct stock', async () => {
    const createResponse = await agent
      .post('/usage-records')
      .send({
        usageDate: '2025-02-02',
        type: 'daily',
        createdById: user.id,
        items: [
          {
            itemId: item.id,
            locationId: location.id,
            quantity: 2,
          },
        ],
      })
      .expect(201);

    const createBody = createResponse.body as ApiResponse<UsageRecordPayload>;
    expect(createBody.success).toBe(true);
    expect(createBody.data.status).toBe('draft');

    const confirmResponse = await agent
      .post(`/usage-records/${createBody.data.id}/confirm`)
      .send({ confirmedById: user.id, remarks: '早餐消耗' })
      .expect(200);

    const confirmBody = confirmResponse.body as ApiResponse<UsageRecordPayload>;
    expect(confirmBody.data.status).toBe('confirmed');

    await agent
      .patch(`/usage-records/${createBody.data.id}`)
      .send({ remarks: 'should fail' })
      .expect(400);

    const stockDetail = await agent.get(`/stock/${stock.id}`).expect(200);
    const stockBody = stockDetail.body as ApiResponse<{
      quantity: number;
    }>;
    expect(stockBody.data.quantity).toBe(4);
  });
});
