import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigType } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<{ app: AppConfigType }, true>,
      ) => {
        const appConfig = configService.getOrThrow<AppConfigType>('app');
        const { jwtSecret, jwtExpiresIn } = appConfig.security;
        if (!jwtSecret) {
          throw new Error('JWT secret is not configured');
        }

        const expiresIn: JwtSignOptions['expiresIn'] =
          typeof jwtExpiresIn === 'number'
            ? jwtExpiresIn
            : (jwtExpiresIn as JwtSignOptions['expiresIn']);

        const jwtOptions: JwtModuleOptions = {
          secret: jwtSecret,
          signOptions: { expiresIn },
        };

        return jwtOptions;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
