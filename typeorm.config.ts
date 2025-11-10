import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envFiles = [
  `.env.${process.env.NODE_ENV ?? 'development'}`,
  '.env',
  'config/local.env',
];

for (const file of envFiles) {
  const filePath = resolve(process.cwd(), file);
  if (existsSync(filePath)) {
    loadEnv({ path: filePath, override: true });
  }
}

const requiredUrl = process.env.DATABASE_URL;

if (!requiredUrl) {
  throw new Error('DATABASE_URL must be defined to initialize the DataSource');
}

const isTsEnv = !!process.argv.find((arg) => arg.endsWith('.ts'));

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: requiredUrl,
  synchronize: false,
  logging: process.env.DATABASE_LOGGING !== 'false',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    isTsEnv ? 'src/modules/**/*.entity.ts' : 'dist/modules/**/*.entity.js',
  ],
  migrations: [isTsEnv ? 'src/migrations/*.ts' : 'dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;

