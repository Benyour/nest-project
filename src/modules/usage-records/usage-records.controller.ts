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
import { ConfirmUsageRecordDto } from './dto/confirm-usage-record.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { UpdateUsageRecordDto } from './dto/update-usage-record.dto';
import { UsageRecordsService } from './usage-records.service';

@ApiTags('使用记录')
@Controller('usage-records')
export class UsageRecordsController {
  constructor(private readonly usageRecordsService: UsageRecordsService) {}

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
  @ApiBadRequestResponse({ description: '参数错误或关联信息不存在' })
  create(@Body() dto: CreateUsageRecordDto) {
    return this.usageRecordsService.create(dto);
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
  ) {
    return this.usageRecordsService.confirm(id, dto);
  }
}
