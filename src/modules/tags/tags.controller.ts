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
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('标签管理')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: '标签列表' })
  @ApiOkResponse({ description: '返回标签数组' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '名称关键字模糊搜索',
  })
  findAll(@Query('keyword') keyword?: string) {
    return this.tagsService.findAll(keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '标签详情' })
  @ApiOkResponse({ description: '返回标签详情' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tagsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建标签' })
  @ApiCreatedResponse({ description: '标签创建成功' })
  @ApiBadRequestResponse({ description: '标签名称重复或参数错误' })
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新标签' })
  @ApiOkResponse({ description: '标签更新成功' })
  @ApiBadRequestResponse({ description: '标签名称重复或参数错误' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除标签' })
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tagsService.remove(id);
  }
}
