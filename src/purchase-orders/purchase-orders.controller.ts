import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';

@ApiTags('采购订单')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建采购订单' })
  @ApiCreatedResponse({
    description: '创建成功，返回完整的采购订单信息',
    type: PurchaseOrder,
  })
  create(@Body() createDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取采购订单列表' })
  @ApiOkResponse({
    description: '返回全部采购订单（含明细）',
    type: PurchaseOrder,
    isArray: true,
  })
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查看采购订单详情' })
  @ApiOkResponse({
    description: '返回指定采购订单详情',
    type: PurchaseOrder,
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新采购订单' })
  @ApiOkResponse({
    description: '更新成功，返回最新的采购订单信息',
    type: PurchaseOrder,
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除采购订单' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
