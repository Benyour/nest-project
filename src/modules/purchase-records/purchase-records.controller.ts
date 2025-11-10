import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfirmPurchaseRecordDto } from './dto/confirm-purchase-record.dto';
import { CreatePurchaseRecordDto } from './dto/create-purchase-record.dto';
import { UpdatePurchaseRecordDto } from './dto/update-purchase-record.dto';
import { PurchaseRecordsService } from './purchase-records.service';

@ApiTags('采购记录')
@Controller('purchase-records')
export class PurchaseRecordsController {
  constructor(
    private readonly purchaseRecordsService: PurchaseRecordsService,
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
  @ApiBadRequestResponse({ description: '参数错误或编号重复' })
  create(@Body() dto: CreatePurchaseRecordDto) {
    return this.purchaseRecordsService.create(dto);
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
  ) {
    return this.purchaseRecordsService.confirm(id, dto);
  }
}
