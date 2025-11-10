import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  async findAll(): Promise<Location[]> {
    return this.locationsRepository.find({
      relations: ['parent', 'children'],
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationsRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return location;
  }

  private async resolveParent(parentId?: string): Promise<Location | null> {
    if (!parentId) {
      return null;
    }
    const parent = await this.locationsRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) {
      throw new BadRequestException(`Parent location ${parentId} not found`);
    }
    return parent;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    const parent = await this.resolveParent(dto.parentId);
    const location = this.locationsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
      parent,
    });
    return this.locationsRepository.save(location);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Location cannot be its own parent');
    }

    const parent = await this.resolveParent(dto.parentId);

    location.name = dto.name ?? location.name;
    location.description = dto.description ?? location.description;
    location.sortOrder = dto.sortOrder ?? location.sortOrder;
    location.parent = parent ?? null;

    return this.locationsRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    const childrenCount = await this.locationsRepository.count({
      where: { parent: { id } },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete location with children');
    }

    await this.locationsRepository.remove(location);
  }
}
