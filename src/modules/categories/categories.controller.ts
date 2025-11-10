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
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

@ApiTags('分类管理')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '获取分类列表（包含父子关系）' })
  @ApiOkResponse({ description: '返回分类数组' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取分类详情' })
  @ApiOkResponse({ description: '返回指定分类的信息' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建分类' })
  @ApiCreatedResponse({ description: '分类创建成功' })
  @ApiBadRequestResponse({ description: '请求参数错误或父级不存在' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  @ApiOkResponse({ description: '分类更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类（无子分类方可删除）' })
  @ApiOkResponse({ description: '删除成功' })
  @ApiBadRequestResponse({ description: '分类存在子分类，无法删除' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.remove(id);
  }
}
