import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ConfirmUsageRecordDto } from './dto/confirm-usage-record.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { UpdateUsageRecordDto } from './dto/update-usage-record.dto';
import { UsageRecordsService } from './usage-records.service';

type AuthenticatedRequest = Request & { user?: { userId?: string } };

@ApiTags('使用记录')
@Controller('usage-records')
export class UsageRecordsController {
  constructor(
    private readonly usageRecordsService: UsageRecordsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @ApiOperation({ summary: '使用记录列表' })
  @ApiOkResponse({ description: '返回使用记录列表（含明细）' })
  findAll() {
    return this.usageRecordsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '使用记录详情' })
  @ApiOkResponse({ description: '返回使用记录详细信息' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usageRecordsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建使用记录（草稿）' })
  @ApiCreatedResponse({ description: '使用记录创建成功' })
  @ApiBadRequestResponse({
    description: '参数错误、关联信息不存在或缺少登录用户',
  })
  create(@Body() dto: CreateUsageRecordDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getRequestUserId(req);
    return this.usageRecordsService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新使用记录（草稿）' })
  @ApiOkResponse({ description: '使用记录更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUsageRecordDto,
  ) {
    return this.usageRecordsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除使用记录（仅草稿）' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usageRecordsService.remove(id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: '确认使用记录并扣减库存' })
  @ApiOkResponse({ description: '确认成功，返回最新使用记录' })
  @ApiBadRequestResponse({ description: '状态不允许或库存不足' })
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmUsageRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getRequestUserId(req, false);
    return this.usageRecordsService.confirm(id, dto, userId);
  }

  private getRequestUserId(req: AuthenticatedRequest): string;
  private getRequestUserId(req: AuthenticatedRequest, required: true): string;
  private getRequestUserId(
    req: AuthenticatedRequest,
    required: false,
  ): string | undefined;
  private getRequestUserId(
    req: AuthenticatedRequest,
    required = true,
  ): string | undefined {
    const headerValue = req.headers['x-user-id'];
    const headerUserId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    const tokenUserId = this.extractUserIdFromAuthorization(req);
    const userId = req.user?.userId ?? headerUserId ?? tokenUserId;

    if (!userId) {
      if (required) {
        throw new BadRequestException('Missing authenticated user');
      }
      return undefined;
    }

    return userId;
  }

  private extractUserIdFromAuthorization(
    req: AuthenticatedRequest,
  ): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader || Array.isArray(authHeader)) {
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (!token || scheme?.toLowerCase() !== 'bearer') {
      return undefined;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return payload?.sub;
    } catch {
      return undefined;
    }
  }
}
