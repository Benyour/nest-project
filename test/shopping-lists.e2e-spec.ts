import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ItemsModule } from '../src/modules/items/items.module';
import { Item } from '../src/modules/items/entities/item.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Location } from '../src/modules/locations/entities/location.entity';
import { Tag } from '../src/modules/tags/entities/tag.entity';
import { ShoppingListsModule } from '../src/modules/shopping-lists/shopping-lists.module';
import { ShoppingList } from '../src/modules/shopping-lists/entities/shopping-list.entity';
import { ShoppingListItem } from '../src/modules/shopping-lists/entities/shopping-list-item.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
};

describe('ShoppingListsModule (e2e)', () => {
  let app: INestApplication;
  let itemRepository: Repository<Item>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            Category,
            Location,
            Item,
            Tag,
            ShoppingList,
            ShoppingListItem,
          ],
          synchronize: true,
        }),
        ItemsModule,
        ShoppingListsModule,
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
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    itemRepository = app.get<Repository<Item>>(getRepositoryToken(Item));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create shopping list and mark items purchased', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const agent = request(server);

    const categoryRepo = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const locationRepo = app.get<Repository<Location>>(
      getRepositoryToken(Location),
    );

    const category = await categoryRepo.save({
      name: '食品',
      sortOrder: 0,
      icon: null,
      parent: null,
    });
    const location = await locationRepo.save({
      name: '厨房',
      sortOrder: 0,
      description: null,
      parent: null,
    });
    const item = await itemRepository.save({
      name: '牛奶',
      unit: '瓶',
      category,
      defaultLocation: location,
      code: null,
      brand: null,
      specification: null,
      shelfLifeDays: null,
      imageUrl: null,
      remarks: null,
      tags: [],
    });

    const createListRes = await agent
      .post('/shopping-lists')
      .send({
        name: '周末采购',
        items: [{ itemId: item.id, quantity: 2 }],
      })
      .expect(201);

    const listBody = createListRes.body as ApiResponse<{
      id: string;
      items: Array<{ item: { id: string }; status: string }>;
    }>;
    const listId = listBody.data.id;
    expect(listBody.data.items).toHaveLength(1);

    await agent
      .post(`/shopping-lists/${listId}/items/${item.id}/purchased`)
      .expect(201);

    const detailRes = await agent.get(`/shopping-lists/${listId}`).expect(200);
    const detailBody = detailRes.body as ApiResponse<{
      status: string;
      items: Array<{ status: string }>;
    }>;
    expect(detailBody.data.status).toBe('completed');
    expect(detailBody.data.items[0].status).toBe('purchased');
  });
});
