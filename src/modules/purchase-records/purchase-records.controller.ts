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
import { ConfirmPurchaseRecordDto } from './dto/confirm-purchase-record.dto';
import { CreatePurchaseRecordDto } from './dto/create-purchase-record.dto';
import { UpdatePurchaseRecordDto } from './dto/update-purchase-record.dto';
import { PurchaseRecordsService } from './purchase-records.service';

type AuthenticatedRequest = Request & { user?: { userId?: string } };

@ApiTags('采购记录')
@Controller('purchase-records')
export class PurchaseRecordsController {
  constructor(
    private readonly purchaseRecordsService: PurchaseRecordsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @ApiOperation({ summary: '采购记录列表' })
  @ApiOkResponse({ description: '返回采购记录列表（含明细）' })
  findAll() {
    return this.purchaseRecordsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '采购记录详情' })
  @ApiOkResponse({ description: '返回采购记录详细信息' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseRecordsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建采购记录（草稿）' })
  @ApiCreatedResponse({ description: '采购记录创建成功' })
  @ApiBadRequestResponse({ description: '参数错误或缺少登录用户' })
  create(
    @Body() dto: CreatePurchaseRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getRequestUserId(req);
    return this.purchaseRecordsService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新采购记录（草稿）' })
  @ApiOkResponse({ description: '采购记录更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePurchaseRecordDto,
  ) {
    return this.purchaseRecordsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除采购记录（仅草稿）' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseRecordsService.remove(id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: '确认采购记录并更新库存' })
  @ApiOkResponse({ description: '确认成功，返回最新采购记录' })
  @ApiBadRequestResponse({ description: '状态不允许或库存处理失败' })
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmPurchaseRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getRequestUserId(req, false);
    return this.purchaseRecordsService.confirm(id, dto, userId);
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
