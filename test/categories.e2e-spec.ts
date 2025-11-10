import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CategoriesModule } from '../src/modules/categories/categories.module';
import { Category } from '../src/modules/categories/entities/category.entity';

type SupertestTarget = Parameters<typeof request>[0];
type SupertestAgent = ReturnType<typeof request.agent>;

type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string | null;
  timestamp: string;
};

type ErrorResponse = {
  success: false;
  code: string;
  message: unknown;
  timestamp: string;
  path: string;
};

type CategoryPayload = {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parent: CategoryPayload | null;
  children: CategoryPayload[];
  createdAt: string;
  updatedAt: string;
};

describe('CategoriesModule (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Category],
          synchronize: true,
        }),
        CategoriesModule,
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create hierarchical categories and enforce deletion rules', async () => {
    const rootResponse = await agent
      .post('/categories')
      .send({ name: '食品' })
      .expect(201);

    const rootBody = rootResponse.body as SuccessResponse<CategoryPayload>;
    expect(rootBody.success).toBe(true);
    expect(rootBody.data.name).toBe('食品');
    expect(rootBody.data.parent).toBeNull();

    const childResponse = await agent
      .post('/categories')
      .send({ name: '零食', parentId: rootBody.data.id })
      .expect(201);

    const childBody = childResponse.body as SuccessResponse<CategoryPayload>;
    expect(childBody.data.parent?.id).toBe(rootBody.data.id);

    const listResponse = await agent.get('/categories').expect(200);
    const listBody = listResponse.body as SuccessResponse<CategoryPayload[]>;
    expect(listBody.data.length).toBe(2);

    const parentFromList = listBody.data.find(
      (item) => item.id === rootBody.data.id,
    );
    expect(parentFromList).toBeDefined();
    expect(parentFromList?.children).toHaveLength(1);
    expect(parentFromList?.children[0].name).toBe('零食');

    const deleteRootResponse = await agent
      .delete(`/categories/${rootBody.data.id}`)
      .expect(400);
    const deleteRootBody = deleteRootResponse.body as ErrorResponse;
    expect(deleteRootBody.success).toBe(false);
    expect(deleteRootBody.message).toContain(
      'Cannot delete category with children',
    );

    await agent.delete(`/categories/${childBody.data.id}`).expect(200);
    await agent.delete(`/categories/${rootBody.data.id}`).expect(200);

    const emptyList = await agent.get('/categories').expect(200);
    const emptyBody = emptyList.body as SuccessResponse<CategoryPayload[]>;
    expect(emptyBody.data).toHaveLength(0);
  });
});
