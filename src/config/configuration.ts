import { ConfigType, registerAs } from '@nestjs/config';

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string | number;
}

export interface DatabaseConfig {
  url: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
}

export interface AppConfig {
  env: string;
  port: number;
  database: DatabaseConfig;
  security: SecurityConfig;
  cors: CorsConfig;
  redis: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
}

const parseListEnv = (value: string | undefined, fallback: string) =>
  (value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    database: {
      url: process.env.DATABASE_URL ?? '',
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
      logging: process.env.DATABASE_LOGGING !== 'false',
      ssl: process.env.DATABASE_SSL === 'true',
    },
    security: {
      jwtSecret: process.env.JWT_SECRET ?? 'change-this-secret',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    },
    cors: {
      enabled: process.env.CORS_ENABLED !== 'false',
      origins: parseListEnv(process.env.CORS_ORIGINS, 'http://localhost:5173'),
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      methods: parseListEnv(
        process.env.CORS_METHODS,
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      ),
      allowedHeaders: parseListEnv(
        process.env.CORS_ALLOWED_HEADERS,
        'Authorization,Content-Type,X-Requested-With',
      ),
      exposedHeaders: parseListEnv(
        process.env.CORS_EXPOSED_HEADERS,
        'X-Total-Count',
      ),
    },
    redis: {
      url: process.env.REDIS_URL ?? '',
    },
    rabbitmq: {
      url: process.env.RABBITMQ_URL ?? '',
    },
  }),
);

export type AppConfigType = ConfigType<typeof appConfig>;

export default appConfig;
