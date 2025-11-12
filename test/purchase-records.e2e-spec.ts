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
import { PurchaseRecordItem } from '../src/modules/purchase-records/entities/purchase-record-item.entity';
import { PurchaseRecord } from '../src/modules/purchase-records/entities/purchase-record.entity';
import { PurchaseRecordsModule } from '../src/modules/purchase-records/purchase-records.module';
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

type PurchaseRecordPayload = {
  id: string;
  code: string;
  status: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number | null;
  }>;
};

describe('PurchaseRecords (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;
  let user: User;
  let category: Category;
  let location: Location;
  let item: Item;

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
            PurchaseRecord,
            PurchaseRecordItem,
          ],
          synchronize: true,
        }),
        UsersModule,
        LocationsModule,
        ItemsModule,
        StockModule,
        PurchaseRecordsModule,
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

    user = await userRepository.save(
      userRepository.create({
        email: 'e2e@example.com',
        password: 'hashed',
        name: 'E2E 用户',
        status: UserStatus.ACTIVE,
      }),
    );

    category = await categoryRepository.save(
      categoryRepository.create({ name: '饮品', sortOrder: 0 }),
    );

    location = await locationRepository.save(
      locationRepository.create({ name: '厨房', sortOrder: 0 }),
    );

    item = await itemRepository.save(
      itemRepository.create({
        name: '鲜牛奶',
        category,
        unit: '瓶',
        defaultLocation: location,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create, update, confirm purchase record and update stock', async () => {
    const createResponse = await agent
      .post('/purchase-records')
      .set('x-user-id', user.id)
      .send({
        purchaseDate: '2025-01-01',
        storeName: 'Costco',
        items: [
          {
            itemId: item.id,
            locationId: location.id,
            quantity: 3,
            unitPrice: 10,
          },
        ],
      })
      .expect(201);

    const createBody =
      createResponse.body as ApiResponse<PurchaseRecordPayload>;
    expect(createBody.success).toBe(true);
    expect(createBody.data.status).toBe('draft');
    expect(createBody.data.code).toMatch(/^PR-\d{8}-[A-Z0-9]{6}$/);

    const updateResponse = await agent
      .patch(`/purchase-records/${createBody.data.id}`)
      .set('x-user-id', user.id)
      .send({
        storeName: 'Sam Club',
        items: [
          {
            itemId: item.id,
            locationId: location.id,
            quantity: 4,
            unitPrice: 12,
          },
        ],
      })
      .expect(200);

    const updateBody =
      updateResponse.body as ApiResponse<PurchaseRecordPayload>;
    expect(updateBody.data.items[0].quantity).toBe(4);

    const confirmResponse = await agent
      .post(`/purchase-records/${createBody.data.id}/confirm`)
      .set('x-user-id', user.id)
      .send({})
      .expect(200);

    const confirmBody =
      confirmResponse.body as ApiResponse<PurchaseRecordPayload>;
    expect(confirmBody.data.status).toBe('confirmed');

    await agent
      .patch(`/purchase-records/${createBody.data.id}`)
      .send({ remarks: 'should fail' })
      .expect(400);

    const stockListResponse = await agent.get('/stock').expect(200);
    const stockBody = stockListResponse.body as ApiResponse<
      Array<{ id: string; quantity: number; item: { id: string } }>
    >;
    expect(stockBody.data).toHaveLength(1);
    expect(stockBody.data[0].quantity).toBe(4);
  });
});
