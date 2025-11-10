import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Location } from '../src/modules/locations/entities/location.entity';
import { Item } from '../src/modules/items/entities/item.entity';
import { StockAdjustment } from '../src/modules/stock/entities/stock-adjustment.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockModule } from '../src/modules/stock/stock.module';

jest.setTimeout(20000);

type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string | null;
  timestamp: string;
};

type StockPayload = {
  id: string;
  quantity: number;
  minQuantity: number;
  item: { id: string; name: string };
  location: { id: string; name: string };
};

type SupertestTarget = Parameters<typeof request>[0];
type SupertestAgent = ReturnType<typeof request.agent>;

describe('StockModule (e2e)', () => {
  let app: INestApplication;
  let agent: request.SuperTest<request.Test>;
  let supertestAgent: SupertestAgent;
  let category: Category;
  let location: Location;
  let item: Item;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Category, Location, Item, Stock, StockAdjustment],
          synchronize: true,
        }),
        StockModule,
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
    supertestAgent = request.agent(server);
    agent = supertestAgent;

    const categoryRepo = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const locationRepo = app.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    const itemRepo = app.get<Repository<Item>>(getRepositoryToken(Item));

    category = await categoryRepo.save({
      name: '食品',
      icon: null,
      sortOrder: 0,
      parent: null,
    });

    location = await locationRepo.save({
      name: '厨房',
      description: null,
      sortOrder: 0,
      parent: null,
    });

    item = await itemRepo.save({
      name: '牛奶',
      unit: '瓶',
      category,
      defaultLocation: location,
      code: 'MILK-001',
      brand: null,
      specification: null,
      shelfLifeDays: null,
      imageUrl: null,
      remarks: null,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create stock, adjust quantity, and list adjustments', async () => {
    const createResponse = await agent
      .post('/stock')
      .send({
        itemId: item.id,
        locationId: location.id,
        quantity: 10,
        minQuantity: 2,
      })
      .expect(201);

    const createBody = createResponse.body as SuccessResponse<StockPayload>;
    expect(createBody.data.quantity).toBe(10);

    const listResponse = await agent
      .get('/stock')
      .query({ lowStockOnly: false })
      .expect(200);
    const listBody = listResponse.body as SuccessResponse<StockPayload[]>;
    expect(listBody.data).toHaveLength(1);

    const adjustResponse = await agent
      .post(`/stock/${createBody.data.id}/adjustments`)
      .send({ type: 'usage', delta: -3, reason: 'daily' })
      .expect(200);

    const adjustBody = adjustResponse.body as SuccessResponse<StockPayload>;
    expect(adjustBody.data.quantity).toBe(7);

    const adjustmentsResponse = await agent
      .get(`/stock/${createBody.data.id}/adjustments`)
      .expect(200);
    const adjustmentsBody = adjustmentsResponse.body as SuccessResponse<
      unknown[]
    >;
    expect(adjustmentsBody.data.length).toBeGreaterThan(0);

    await agent
      .patch(`/stock/${createBody.data.id}`)
      .send({ quantity: 12, memo: '补货' })
      .expect(200);

    const detailResponse = await agent
      .get(`/stock/${createBody.data.id}`)
      .expect(200);
    const detailBody = detailResponse.body as SuccessResponse<StockPayload>;
    expect(detailBody.data.quantity).toBe(12);

    await agent.delete(`/stock/${createBody.data.id}`).expect(200);

    const emptyList = await agent.get('/stock').expect(200);
    const emptyBody = emptyList.body as SuccessResponse<StockPayload[]>;
    expect(emptyBody.data).toHaveLength(0);
  });
});
