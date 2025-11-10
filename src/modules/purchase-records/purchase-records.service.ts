import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockAdjustmentType } from '../stock/entities/stock-adjustment.entity';
import { StockService } from '../stock/stock.service';
import { User } from '../users/entities/user.entity';
import { ConfirmPurchaseRecordDto } from './dto/confirm-purchase-record.dto';
import { CreatePurchaseRecordDto } from './dto/create-purchase-record.dto';
import { PurchaseRecordItemDto } from './dto/purchase-record-item.dto';
import { UpdatePurchaseRecordDto } from './dto/update-purchase-record.dto';
import {
  PurchaseRecord,
  PurchaseRecordStatus,
} from './entities/purchase-record.entity';
import { PurchaseRecordItem } from './entities/purchase-record-item.entity';

@Injectable()
export class PurchaseRecordsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseRecord)
    private readonly purchaseRecordRepository: Repository<PurchaseRecord>,
    @InjectRepository(PurchaseRecordItem)
    private readonly purchaseRecordItemRepository: Repository<PurchaseRecordItem>,
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

  async findAll(): Promise<PurchaseRecord[]> {
    return this.purchaseRecordRepository.find({
      relations: ['items', 'items.item', 'items.location', 'createdBy'],
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PurchaseRecord> {
    const record = await this.purchaseRecordRepository.findOne({
      where: { id },
      relations: ['items', 'items.item', 'items.location', 'createdBy'],
    });
    if (!record) {
      throw new NotFoundException(`Purchase record ${id} not found`);
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

  private calculateTotal(items: PurchaseRecordItemDto[]): number {
    return items.reduce((sum, item) => {
      if (item.totalPrice !== undefined) {
        return sum + item.totalPrice;
      }
      if (item.unitPrice !== undefined) {
        return sum + item.unitPrice * item.quantity;
      }
      return sum;
    }, 0);
  }

  async create(dto: CreatePurchaseRecordDto): Promise<PurchaseRecord> {
    const existing = await this.purchaseRecordRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Purchase record code ${dto.code} already exists`,
      );
    }

    const createdBy = await this.ensureUser(dto.createdById);

    const items = await Promise.all(
      dto.items.map(async (itemDto) => {
        const item = await this.ensureItem(itemDto.itemId);
        const location = await this.ensureLocation(itemDto.locationId);
        return { itemDto, item, location } as const;
      }),
    );

    const record = this.purchaseRecordRepository.create({
      code: dto.code,
      createdBy,
      purchaseDate: dto.purchaseDate,
      status: dto.status ?? PurchaseRecordStatus.DRAFT,
      storeName: dto.storeName ?? null,
      storeType: dto.storeType ?? null,
      remarks: dto.remarks ?? null,
      totalAmount: this.calculateTotal(dto.items),
    });

    record.items = items.map(({ itemDto, item, location }) =>
      this.purchaseRecordItemRepository.create({
        item,
        location,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice ?? null,
        totalPrice:
          itemDto.totalPrice ??
          (itemDto.unitPrice !== undefined
            ? Number((itemDto.unitPrice * itemDto.quantity).toFixed(2))
            : null),
        expiryDate: itemDto.expiryDate ?? null,
        remarks: itemDto.remarks ?? null,
      }),
    );

    return this.purchaseRecordRepository.save(record);
  }

  async update(
    id: string,
    dto: UpdatePurchaseRecordDto,
  ): Promise<PurchaseRecord> {
    const record = await this.findOne(id);

    if (record.status !== PurchaseRecordStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase records can be updated',
      );
    }

    if (dto.createdById) {
      record.createdBy = await this.ensureUser(dto.createdById);
    }

    record.purchaseDate = dto.purchaseDate ?? record.purchaseDate;
    record.storeName = dto.storeName ?? record.storeName;
    record.storeType = dto.storeType ?? record.storeType;
    record.remarks = dto.remarks ?? record.remarks;
    record.status = dto.status ?? record.status;

    if (dto.items) {
      await this.purchaseRecordItemRepository.delete({ record: { id } });
      const items = await Promise.all(
        dto.items.map(async (itemDto) => {
          const item = await this.ensureItem(itemDto.itemId);
          const location = await this.ensureLocation(itemDto.locationId);
          return this.purchaseRecordItemRepository.create({
            record,
            item,
            location,
            quantity: itemDto.quantity,
            unitPrice: itemDto.unitPrice ?? null,
            totalPrice:
              itemDto.totalPrice ??
              (itemDto.unitPrice !== undefined
                ? Number((itemDto.unitPrice * itemDto.quantity).toFixed(2))
                : null),
            expiryDate: itemDto.expiryDate ?? null,
            remarks: itemDto.remarks ?? null,
          });
        }),
      );
      await this.purchaseRecordItemRepository.save(items);
      record.items = items;
      record.totalAmount = this.calculateTotal(dto.items);
    }

    return this.purchaseRecordRepository.save(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    if (record.status !== PurchaseRecordStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase records can be deleted',
      );
    }
    await this.purchaseRecordRepository.remove(record);
  }

  async confirm(
    id: string,
    dto: ConfirmPurchaseRecordDto,
  ): Promise<PurchaseRecord> {
    const record = await this.findOne(id);

    if (record.status !== PurchaseRecordStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase records can be confirmed',
      );
    }

    const confirmedBy = dto.confirmedById
      ? await this.ensureUser(dto.confirmedById)
      : null;

    await this.dataSource.transaction(async (manager) => {
      const supportsLock = manager.connection.options.type !== 'sqlite';

      const itemRepository = manager.getRepository(PurchaseRecordItem);
      const itemsQb = itemRepository
        .createQueryBuilder('recordItem')
        .innerJoinAndSelect('recordItem.item', 'item')
        .innerJoinAndSelect('recordItem.location', 'location')
        .where('recordItem.recordId = :id', { id });

      if (supportsLock) {
        itemsQb.setLock('pessimistic_write');
      }

      const items = await itemsQb.getMany();

      for (const item of items) {
        const stockRepository = manager.getRepository(Stock);

        const stockQb = stockRepository
          .createQueryBuilder('stock')
          .where('stock.itemId = :itemId', { itemId: item.item.id })
          .andWhere('stock.locationId = :locationId', {
            locationId: item.location.id,
          });

        if (supportsLock) {
          stockQb.setLock('pessimistic_write');
        }

        let stock = await stockQb.getOne();

        if (!stock) {
          stock = manager.create(Stock, {
            item: item.item,
            location: item.location,
            quantity: 0,
            minQuantity: 0,
            latestPurchasePrice: item.unitPrice ?? null,
            latestPurchaseDate: record.purchaseDate,
            expiryDate: item.expiryDate ?? null,
            memo: dto.remarks ?? null,
          });
          stock = await manager.save(stock);
        }

        await this.stockService.adjustQuantity(
          stock.id,
          {
            type: StockAdjustmentType.PURCHASE,
            delta: item.quantity,
            reason: 'purchase_confirmed',
            remarks: dto.remarks,
            createdById: confirmedBy?.id,
          },
          manager,
        );
      }

      record.status = PurchaseRecordStatus.CONFIRMED;
      record.remarks = dto.remarks ?? record.remarks;
      await manager.save(record);
    });

    return this.findOne(id);
  }
}
