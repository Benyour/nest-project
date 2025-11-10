import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Location } from '../locations/entities/location.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items.query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  async findAll(query: ListItemsQueryDto): Promise<Item[]> {
    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.defaultLocation', 'location')
      .orderBy('item.name', 'ASC');

    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.locationId) {
      qb.andWhere('location.id = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.keyword) {
      qb.andWhere(
        "(LOWER(item.name) LIKE :keyword OR LOWER(COALESCE(item.code, '')) LIKE :keyword)",
        { keyword: `%${query.keyword.toLowerCase()}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: ['category', 'defaultLocation'],
    });

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  private async ensureCategory(categoryId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} not found`);
    }
    return category;
  }

  private async ensureLocation(locationId?: string): Promise<Location | null> {
    if (!locationId) {
      return null;
    }
    const location = await this.locationsRepository.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new BadRequestException(`Location ${locationId} not found`);
    }
    return location;
  }

  private async ensureCodeUnique(code?: string, excludeId?: string) {
    if (!code) {
      return;
    }
    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.code = :code', { code });
    if (excludeId) {
      qb.andWhere('item.id != :id', { id: excludeId });
    }
    const exists = await qb.getOne();
    if (exists) {
      throw new BadRequestException(`Item code ${code} already exists`);
    }
  }

  async create(dto: CreateItemDto): Promise<Item> {
    await this.ensureCodeUnique(dto.code);
    const category = await this.ensureCategory(dto.categoryId);
    const defaultLocation = await this.ensureLocation(dto.defaultLocationId);

    const item = this.itemsRepository.create({
      name: dto.name,
      code: dto.code ?? null,
      brand: dto.brand ?? null,
      specification: dto.specification ?? null,
      unit: dto.unit,
      shelfLifeDays: dto.shelfLifeDays ?? null,
      imageUrl: dto.imageUrl ?? null,
      remarks: dto.remarks ?? null,
      category,
      defaultLocation,
    });

    return this.itemsRepository.save(item);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);

    if (dto.code) {
      await this.ensureCodeUnique(dto.code, id);
    }

    if (dto.categoryId) {
      item.category = await this.ensureCategory(dto.categoryId);
    }

    if (dto.defaultLocationId !== undefined) {
      item.defaultLocation = await this.ensureLocation(dto.defaultLocationId);
    }

    item.name = dto.name ?? item.name;
    item.code = dto.code ?? item.code;
    item.brand = dto.brand ?? item.brand;
    item.specification = dto.specification ?? item.specification;
    item.unit = dto.unit ?? item.unit;
    item.shelfLifeDays = dto.shelfLifeDays ?? item.shelfLifeDays;
    item.imageUrl = dto.imageUrl ?? item.imageUrl;
    item.remarks = dto.remarks ?? item.remarks;

    return this.itemsRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemsRepository.remove(item);
  }
}
