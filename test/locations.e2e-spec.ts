import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Location } from '../src/modules/locations/entities/location.entity';
import { LocationsModule } from '../src/modules/locations/locations.module';

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

type LocationPayload = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  parent: LocationPayload | null;
  children: LocationPayload[];
  createdAt: string;
  updatedAt: string;
};

describe('LocationsModule (e2e)', () => {
  let app: INestApplication;
  let agent: SupertestAgent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Location],
          synchronize: true,
        }),
        LocationsModule,
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

  it('should manage nested locations and block deletions with children', async () => {
    const parentResponse = await agent
      .post('/locations')
      .send({ name: '厨房', description: '主厨房' })
      .expect(201);

    const parentBody = parentResponse.body as SuccessResponse<LocationPayload>;
    expect(parentBody.data.name).toBe('厨房');
    expect(parentBody.data.parent).toBeNull();

    const childResponse = await agent
      .post('/locations')
      .send({ name: '调料柜', parentId: parentBody.data.id })
      .expect(201);

    const childBody = childResponse.body as SuccessResponse<LocationPayload>;
    expect(childBody.data.parent?.id).toBe(parentBody.data.id);

    const listResponse = await agent.get('/locations').expect(200);
    const listBody = listResponse.body as SuccessResponse<LocationPayload[]>;
    expect(listBody.data).toHaveLength(2);

    const parentFromList = listBody.data.find(
      (loc) => loc.id === parentBody.data.id,
    );
    expect(parentFromList?.children).toHaveLength(1);

    const deleteParentResponse = await agent
      .delete(`/locations/${parentBody.data.id}`)
      .expect(400);
    const deleteParentBody = deleteParentResponse.body as ErrorResponse;
    expect(deleteParentBody.message).toContain(
      'Cannot delete location with children',
    );

    await agent.delete(`/locations/${childBody.data.id}`).expect(200);
    await agent.delete(`/locations/${parentBody.data.id}`).expect(200);

    const emptyList = await agent.get('/locations').expect(200);
    const emptyBody = emptyList.body as SuccessResponse<LocationPayload[]>;
    expect(emptyBody.data).toHaveLength(0);
  });
});
