import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserPayload } from './decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiCreatedResponse({ description: '注册成功，返回用户信息' })
  @ApiBadRequestResponse({ description: '请求参数错误或邮箱已被使用' })
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiOkResponse({ description: '登录成功，返回 token 与用户信息' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.getProfile(currentUser.userId);
  }
}
