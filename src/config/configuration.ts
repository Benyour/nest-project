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

export interface AppConfig {
  env: string;
  port: number;
  database: DatabaseConfig;
  security: SecurityConfig;
  redis: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
}

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
