import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      relations: ['parent', 'children'],
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  private async resolveParent(parentId?: string): Promise<Category | null> {
    if (!parentId) {
      return null;
    }
    const parent = await this.categoriesRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) {
      throw new BadRequestException(`Parent category ${parentId} not found`);
    }
    return parent;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const parent = await this.resolveParent(dto.parentId);
    const category = this.categoriesRepository.create({
      name: dto.name,
      icon: dto.icon ?? null,
      sortOrder: dto.sortOrder ?? 0,
      parent,
    });
    return this.categoriesRepository.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parent = await this.resolveParent(dto.parentId);

    category.name = dto.name ?? category.name;
    category.icon = dto.icon ?? category.icon;
    category.sortOrder = dto.sortOrder ?? category.sortOrder;
    category.parent = parent ?? null;

    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const childrenCount = await this.categoriesRepository.count({
      where: { parent: { id } },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with children');
    }

    await this.categoriesRepository.remove(category);
  }
}
