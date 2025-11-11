import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async findAll(keyword?: string): Promise<Tag[]> {
    const qb = this.tagsRepository
      .createQueryBuilder('tag')
      .orderBy('LOWER(tag.name)', 'ASC');

    if (keyword) {
      qb.where('LOWER(tag.name) LIKE :keyword', {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }
    return tag;
  }

  private async ensureNameUnique(name: string, excludeId?: string) {
    const qb = this.tagsRepository
      .createQueryBuilder('tag')
      .where('LOWER(tag.name) = :name', { name: name.toLowerCase() });

    if (excludeId) {
      qb.andWhere('tag.id != :id', { id: excludeId });
    }

    const exists = await qb.getOne();
    if (exists) {
      throw new BadRequestException(`Tag name ${name} already exists`);
    }
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    await this.ensureNameUnique(dto.name);
    const tag = this.tagsRepository.create({
      name: dto.name.trim(),
    });
    return this.tagsRepository.save(tag);
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    if (dto.name && dto.name !== tag.name) {
      await this.ensureNameUnique(dto.name, id);
      tag.name = dto.name.trim();
    }

    return this.tagsRepository.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagsRepository.remove(tag);
  }
}
