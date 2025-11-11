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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShoppingListsService } from './shopping-lists.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { UpdateShoppingListStatusDto } from './dto/update-shopping-list-status.dto';

@ApiTags('购物清单')
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(private readonly shoppingListsService: ShoppingListsService) {}

  @Get()
  @ApiOperation({ summary: '获取购物清单列表' })
  findAll() {
    return this.shoppingListsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取购物清单详情' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shoppingListsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建购物清单' })
  create(@Body() dto: CreateShoppingListDto) {
    return this.shoppingListsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新购物清单（名称、备注、明细）' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShoppingListDto,
  ) {
    return this.shoppingListsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新购物清单状态' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShoppingListStatusDto,
  ) {
    return this.shoppingListsService.updateStatus(id, dto);
  }

  @Post(':id/items/:itemId/purchased')
  @ApiOperation({ summary: '标记单个条目已购买' })
  markPurchased(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.shoppingListsService.markItemStatus(id, itemId, 'purchased');
  }

  @Post(':id/items/:itemId/reset')
  @ApiOperation({ summary: '将单个条目标记为未购买' })
  markPending(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.shoppingListsService.markItemStatus(id, itemId, 'pending');
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除购物清单' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shoppingListsService.remove(id);
  }
}
