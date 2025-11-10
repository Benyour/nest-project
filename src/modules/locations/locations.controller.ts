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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('位置管理')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: '获取位置列表（包含父子关系）' })
  @ApiOkResponse({ description: '返回位置数组' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取位置详情' })
  @ApiOkResponse({ description: '返回指定位置的信息' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建位置' })
  @ApiCreatedResponse({ description: '位置创建成功' })
  @ApiBadRequestResponse({ description: '请求参数错误或父级不存在' })
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新位置' })
  @ApiOkResponse({ description: '位置更新成功' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除位置（无子位置方可删除）' })
  @ApiOkResponse({ description: '删除成功' })
  @ApiBadRequestResponse({ description: '位置存在子位置，无法删除' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.locationsService.remove(id);
  }
}
