import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: unknown;
  timestamp: string;
}

interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    avatarUrl: string | null;
  };
}

interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

type SupertestTarget = Parameters<typeof request>[0];

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let server: SupertestTarget;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              app: {
                security: {
                  jwtSecret: 'test-secret',
                  jwtExpiresIn: '1h',
                },
              },
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        UsersModule,
        AuthModule,
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
    server = app.getHttpServer() as SupertestTarget;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register, login and get profile successfully', async () => {
    const registerResponse = await request(server)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Passw0rd!',
        name: '测试用户',
      })
      .expect(201);

    const registerBody = registerResponse.body as ApiResponse<RegisterResponse>;
    expect(registerBody.success).toBe(true);
    expect(registerBody.data.email).toBe('test@example.com');
    expect(registerBody.data).not.toHaveProperty('password');

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Passw0rd!',
      })
      .expect(201);

    const loginBody = loginResponse.body as ApiResponse<LoginResponse>;
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.accessToken).toBeDefined();
    const token = loginBody.data.accessToken;

    const profileResponse = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const profileBody = profileResponse.body as ApiResponse<ProfileResponse>;
    expect(profileBody.success).toBe(true);
    expect(profileBody.data.email).toBe('test@example.com');
    expect(profileBody.data).not.toHaveProperty('password');
  });
});
