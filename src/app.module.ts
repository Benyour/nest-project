import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, { AppConfigType } from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ItemsModule } from './modules/items/items.module';
import { StockModule } from './modules/stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<{ app: AppConfigType }, true>,
      ) => {
        const appConfig = configService.getOrThrow<AppConfigType>('app');
        const {
          url,
          synchronize = false,
          logging = false,
          ssl = false,
        } = appConfig.database;

        if (!url) {
          throw new Error('DATABASE_URL is not configured');
        }

        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize,
          logging,
          ssl: ssl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    LocationsModule,
    ItemsModule,
    StockModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
