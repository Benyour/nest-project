import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockAdjustmentType } from '../stock/entities/stock-adjustment.entity';
import { StockService } from '../stock/stock.service';
import { User } from '../users/entities/user.entity';
import { ConfirmUsageRecordDto } from './dto/confirm-usage-record.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { UpdateUsageRecordDto } from './dto/update-usage-record.dto';
import { UsageRecord, UsageRecordStatus } from './entities/usage-record.entity';
import { UsageRecordItem } from './entities/usage-record-item.entity';

@Injectable()
export class UsageRecordsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UsageRecord)
    private readonly usageRecordRepository: Repository<UsageRecord>,
    @InjectRepository(UsageRecordItem)
    private readonly usageRecordItemRepository: Repository<UsageRecordItem>,
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly stockService: StockService,
  ) {}

  async findAll(): Promise<UsageRecord[]> {
    return this.usageRecordRepository.find({
      relations: ['items', 'items.item', 'items.location', 'createdBy'],
      order: { usageDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UsageRecord> {
    const record = await this.usageRecordRepository.findOne({
      where: { id },
      relations: ['items', 'items.item', 'items.location', 'createdBy'],
    });
    if (!record) {
      throw new NotFoundException(`Usage record ${id} not found`);
    }
    return record;
  }

  private async ensureUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }
    return user;
  }

  private async ensureItem(itemId: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new BadRequestException(`Item ${itemId} not found`);
    }
    return item;
  }

  private async ensureLocation(locationId: string): Promise<Location> {
    const location = await this.locationsRepository.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new BadRequestException(`Location ${locationId} not found`);
    }
    return location;
  }

  async create(dto: CreateUsageRecordDto): Promise<UsageRecord> {
    const createdBy = await this.ensureUser(dto.createdById);

    const items = await Promise.all(
      dto.items.map(async (itemDto) => {
        const item = await this.ensureItem(itemDto.itemId);
        const location = await this.ensureLocation(itemDto.locationId);
        return { itemDto, item, location } as const;
      }),
    );

    const record = this.usageRecordRepository.create({
      usageDate: dto.usageDate,
      type: dto.type,
      status: dto.status ?? UsageRecordStatus.DRAFT,
      createdBy,
      remarks: dto.remarks ?? null,
    });

    record.items = items.map(({ itemDto, item, location }) =>
      this.usageRecordItemRepository.create({
        item,
        location,
        quantity: itemDto.quantity,
        remarks: itemDto.remarks ?? null,
      }),
    );

    return this.usageRecordRepository.save(record);
  }

  async update(id: string, dto: UpdateUsageRecordDto): Promise<UsageRecord> {
    const record = await this.findOne(id);

    if (record.status !== UsageRecordStatus.DRAFT) {
      throw new BadRequestException('Only draft usage records can be updated');
    }

    if (dto.createdById) {
      record.createdBy = await this.ensureUser(dto.createdById);
    }

    record.usageDate = dto.usageDate ?? record.usageDate;
    record.type = dto.type ?? record.type;
    record.status = dto.status ?? record.status;
    record.remarks = dto.remarks ?? record.remarks;

    if (dto.items) {
      await this.usageRecordItemRepository.delete({ record: { id } });
      const items = await Promise.all(
        dto.items.map(async (itemDto) => {
          const item = await this.ensureItem(itemDto.itemId);
          const location = await this.ensureLocation(itemDto.locationId);
          return this.usageRecordItemRepository.create({
            record,
            item,
            location,
            quantity: itemDto.quantity,
            remarks: itemDto.remarks ?? null,
          });
        }),
      );
      await this.usageRecordItemRepository.save(items);
      record.items = items;
    }

    return this.usageRecordRepository.save(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    if (record.status !== UsageRecordStatus.DRAFT) {
      throw new BadRequestException('Only draft usage records can be deleted');
    }
    await this.usageRecordRepository.remove(record);
  }

  private async deductStock(
    manager: EntityManager,
    item: UsageRecordItem,
    remarks?: string,
    confirmedById?: string,
  ) {
    const supportsLock = manager.connection.options.type !== 'sqlite';

    const stock = await manager.findOne(Stock, {
      where: {
        item: { id: item.item.id },
        location: { id: item.location.id },
      },
      ...(supportsLock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    if (!stock) {
      throw new BadRequestException(
        `Stock not found for item ${item.item.id} at location ${item.location.id}`,
      );
    }

    if (stock.quantity < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for item ${item.item.id} at location ${item.location.id}`,
      );
    }

    await this.stockService.adjustQuantity(
      stock.id,
      {
        type: StockAdjustmentType.USAGE,
        delta: -item.quantity,
        reason: 'usage_confirmed',
        remarks,
        createdById: confirmedById,
      },
      manager,
    );
  }

  async confirm(id: string, dto: ConfirmUsageRecordDto): Promise<UsageRecord> {
    const record = await this.findOne(id);

    if (record.status !== UsageRecordStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft usage records can be confirmed',
      );
    }

    const confirmedBy = dto.confirmedById
      ? await this.ensureUser(dto.confirmedById)
      : null;

    await this.dataSource.transaction(async (manager) => {
      const items = await manager.find(UsageRecordItem, {
        where: { record: { id } },
        relations: ['item', 'location'],
      });

      for (const item of items) {
        await this.deductStock(manager, item, dto.remarks, confirmedBy?.id);
      }

      record.status = UsageRecordStatus.CONFIRMED;
      record.remarks = dto.remarks ?? record.remarks;
      await manager.save(record);
    });

    return this.findOne(id);
  }
}
