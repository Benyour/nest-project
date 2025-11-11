import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import { AppConfigType } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService =
    app.get<ConfigService<{ app: AppConfigType }, true>>(ConfigService);
  const appConfig = configService.getOrThrow<AppConfigType>('app');
  const { cors } = appConfig;

  if (cors.enabled) {
    const origin =
      cors.origins.length === 1 && cors.origins[0] === '*'
        ? true
        : cors.origins;

    app.enableCors({
      origin,
      credentials: cors.credentials,
      methods: cors.methods.join(','),
      allowedHeaders: cors.allowedHeaders.join(','),
      exposedHeaders: cors.exposedHeaders.join(','),
    });
  }

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const requestLogger = new RequestLoggerMiddleware();
  app.use(requestLogger.use.bind(requestLogger));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('采购订单 API')
    .setDescription('采购订单（主表 + 明细）CRUD 接口文档')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = appConfig.port ?? 3000;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
  Logger.log(`Swagger UI available at http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  Logger.error('Application failed to start', error);
  process.exit(1);
});
