import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Item } from '../src/modules/items/entities/item.entity';
import { Tag } from '../src/modules/tags/entities/tag.entity';
import { TagsModule } from '../src/modules/tags/tags.module';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Location } from '../src/modules/locations/entities/location.entity';

type SupertestTarget = Parameters<typeof request>[0];
type SupertestAgent = ReturnType<typeof request.agent>;

type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string | null;
  timestamp: string;
};

describe('TagsModule (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;
  let tagRepository: Repository<Tag>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Tag, Item, Category, Location],
          synchronize: true,
        }),
        TagsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    const server = app.getHttpServer() as SupertestTarget;
    agent = request.agent(server);

    tagRepository = app.get<Repository<Tag>>(getRepositoryToken(Tag));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should perform tag CRUD successfully', async () => {
    const createResponse = await agent
      .post('/tags')
      .send({ name: '常用' })
      .expect(201);

    const createBody = createResponse.body as SuccessResponse<Tag>;
    expect(createBody.data.name).toBe('常用');

    const listResponse = await agent.get('/tags').expect(200);
    const listBody = listResponse.body as SuccessResponse<Tag[]>;
    expect(listBody.data).toHaveLength(1);

    const detailResponse = await agent
      .get(`/tags/${createBody.data.id}`)
      .expect(200);
    const detailBody = detailResponse.body as SuccessResponse<Tag>;
    expect(detailBody.data.name).toBe('常用');

    const updateResponse = await agent
      .patch(`/tags/${createBody.data.id}`)
      .send({ name: '必买' })
      .expect(200);
    const updateBody = updateResponse.body as SuccessResponse<Tag>;
    expect(updateBody.data.name).toBe('必买');

    await agent.delete(`/tags/${createBody.data.id}`).expect(200);

    const remaining = await tagRepository.find();
    expect(remaining).toHaveLength(0);
  });
});
