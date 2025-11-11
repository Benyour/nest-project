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
import { ItemsModule } from '../src/modules/items/items.module';
import { Tag } from '../src/modules/tags/entities/tag.entity';

type SupertestTarget = Parameters<typeof request>[0];
type SupertestAgent = ReturnType<typeof request.agent>;

type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string | null;
  timestamp: string;
};

type ItemPayload = {
  id: string;
  name: string;
  code: string | null;
  brand: string | null;
  specification: string | null;
  unit: string;
  shelfLifeDays: number | null;
  imageUrl: string | null;
  remarks: string | null;
  category: {
    id: string;
    name: string;
  };
  defaultLocation: {
    id: string;
    name: string;
  } | null;
  tags: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
};

describe('ItemsModule (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;
  let category: Category;
  let location: Location;
  let tag: Tag;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Category, Location, Item, Tag],
          synchronize: true,
        }),
        ItemsModule,
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

    const categoryRepository = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const locationRepository = app.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    const tagRepository = app.get<Repository<Tag>>(getRepositoryToken(Tag));

    category = await categoryRepository.save({
      name: '食品',
      icon: null,
      sortOrder: 0,
      parent: null,
    });

    location = await locationRepository.save({
      name: '厨房',
      description: null,
      sortOrder: 0,
      parent: null,
    });

    tag = await tagRepository.save({
      name: '常用',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create, query, update and delete item successfully', async () => {
    const createResponse = await agent
      .post('/items')
      .send({
        categoryId: category.id,
        name: '有机牛奶',
        unit: '瓶',
        code: 'MILK-001',
        defaultLocationId: location.id,
        shelfLifeDays: 30,
        tagIds: [tag.id],
      })
      .expect(201);

    const createBody = createResponse.body as SuccessResponse<ItemPayload>;
    expect(createBody.data.name).toBe('有机牛奶');
    expect(createBody.data.category.id).toBe(category.id);
    expect(createBody.data.defaultLocation?.id).toBe(location.id);
    expect(createBody.data.tags).toEqual([
      expect.objectContaining({ id: tag.id, name: tag.name }),
    ]);

    const listResponse = await agent
      .get('/items')
      .query({ categoryId: category.id, keyword: '牛奶' })
      .expect(200);
    const listBody = listResponse.body as SuccessResponse<ItemPayload[]>;
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].tags).toHaveLength(1);

    const detailResponse = await agent
      .get(`/items/${createBody.data.id}`)
      .expect(200);
    const detailBody = detailResponse.body as SuccessResponse<ItemPayload>;
    expect(detailBody.data.code).toBe('MILK-001');
    expect(detailBody.data.tags).toHaveLength(1);

    const updateResponse = await agent
      .patch(`/items/${createBody.data.id}`)
      .send({
        name: '低脂牛奶',
        brand: '品牌B',
        code: 'MILK-002',
        tagIds: [],
      })
      .expect(200);
    const updateBody = updateResponse.body as SuccessResponse<ItemPayload>;
    expect(updateBody.data.name).toBe('低脂牛奶');
    expect(updateBody.data.brand).toBe('品牌B');
    expect(updateBody.data.code).toBe('MILK-002');
    expect(updateBody.data.tags).toHaveLength(0);

    await agent.delete(`/items/${createBody.data.id}`).expect(200);

    const emptyList = await agent.get('/items').expect(200);
    const emptyBody = emptyList.body as SuccessResponse<ItemPayload[]>;
    expect(emptyBody.data).toHaveLength(0);
  });
});
