import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items.query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@ApiTags('物品管理')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: '物品列表查询' })
  @ApiOkResponse({ description: '返回物品列表及关联信息' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    type: [String],
    description: '按标签筛选（多个标签之间为或关系）',
  })
  findAll(@Query() query: ListItemsQueryDto) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取物品详情' })
  @ApiOkResponse({ description: '返回物品详情' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建物品' })
  @ApiCreatedResponse({ description: '物品创建成功' })
  @ApiBadRequestResponse({ description: '关联信息不存在或编码重复' })
  create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新物品' })
  @ApiOkResponse({ description: '物品更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除物品' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.itemsService.remove(id);
  }
}
