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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { ListStockQueryDto } from './dto/list-stock.query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockService } from './stock.service';

@ApiTags('库存管理')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: '库存列表查询' })
  @ApiOkResponse({ description: '返回库存列表' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'lowStockOnly', required: false })
  findAll(@Query() query: ListStockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取库存详情' })
  @ApiOkResponse({ description: '返回库存详细信息' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建库存记录' })
  @ApiCreatedResponse({ description: '库存记录创建成功' })
  @ApiBadRequestResponse({ description: '物品或位置不存在，或库存记录已存在' })
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新库存信息' })
  @ApiOkResponse({ description: '库存记录更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.stockService.update(id, updateStockDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除库存记录' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockService.remove(id);
  }

  @Post(':id/adjustments')
  @HttpCode(200)
  @ApiOperation({ summary: '调整库存数量' })
  @ApiOkResponse({ description: '调整完成后返回最新库存信息' })
  @ApiBadRequestResponse({ description: '调整后数量为负数或参数错误' })
  adjust(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.stockService.adjustQuantity(id, dto);
  }

  @Get(':id/adjustments')
  @ApiOperation({ summary: '查看库存调整记录' })
  @ApiOkResponse({ description: '返回调整记录列表' })
  listAdjustments(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockService.listAdjustments(id);
  }
}
