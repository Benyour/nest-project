import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { ListStockQueryDto } from './dto/list-stock.query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import {
  StockAdjustment,
  StockAdjustmentType,
} from './entities/stock-adjustment.entity';
import { Stock } from './entities/stock.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockAdjustment)
    private readonly adjustmentRepository: Repository<StockAdjustment>,
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(query: ListStockQueryDto): Promise<Stock[]> {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.item', 'item')
      .leftJoinAndSelect('stock.location', 'location')
      .orderBy('item.name', 'ASC');

    if (query.itemId) {
      qb.andWhere('item.id = :itemId', { itemId: query.itemId });
    }

    if (query.locationId) {
      qb.andWhere('location.id = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.lowStockOnly) {
      qb.andWhere('stock.quantity <= stock.minQuantity');
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Stock> {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['item', 'location'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }

    return stock;
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

  private async ensureUnique(
    item: Item,
    location: Location,
    excludeId?: string,
  ) {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .where('stock.itemId = :itemId', { itemId: item.id })
      .andWhere('stock.locationId = :locationId', { locationId: location.id });
    if (excludeId) {
      qb.andWhere('stock.id != :id', { id: excludeId });
    }
    const exists = await qb.getOne();
    if (exists) {
      throw new BadRequestException(
        'Stock record for this item and location already exists',
      );
    }
  }

  private async ensureUser(userId?: string): Promise<User | null> {
    if (!userId) {
      return null;
    }
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }
    return user;
  }

  async create(dto: CreateStockDto): Promise<Stock> {
    const item = await this.ensureItem(dto.itemId);
    const location = await this.ensureLocation(dto.locationId);
    await this.ensureUnique(item, location);

    const stock = this.stockRepository.create({
      item,
      location,
      quantity: dto.quantity,
      minQuantity: dto.minQuantity ?? 0,
      latestPurchasePrice: dto.latestPurchasePrice ?? null,
      latestPurchaseDate: dto.latestPurchaseDate ?? null,
      expiryDate: dto.expiryDate ?? null,
      memo: dto.memo ?? null,
    });

    const saved = await this.stockRepository.save(stock);

    await this.createAdjustment(
      saved,
      StockAdjustmentType.MANUAL,
      0,
      dto.quantity,
      {
        reason: 'initial_create',
        remarks: dto.memo ?? null,
        createdBy: null,
      },
    );

    return saved;
  }

  async update(id: string, dto: UpdateStockDto): Promise<Stock> {
    const stock = await this.findOne(id);

    if (dto.itemId || dto.locationId) {
      const item = dto.itemId ? await this.ensureItem(dto.itemId) : stock.item;
      const location = dto.locationId
        ? await this.ensureLocation(dto.locationId)
        : stock.location;
      await this.ensureUnique(item, location, id);
      stock.item = item;
      stock.location = location;
    }

    if (dto.quantity !== undefined) {
      const newQuantity = dto.quantity;
      if (newQuantity < 0) {
        throw new BadRequestException('Quantity cannot be negative');
      }
      if (newQuantity !== stock.quantity) {
        await this.createAdjustment(
          stock,
          StockAdjustmentType.MANUAL,
          stock.quantity,
          newQuantity,
          {
            reason: 'manual_update',
            remarks: dto.memo ?? null,
            createdBy: null,
          },
        );
        stock.quantity = newQuantity;
      }
    }

    stock.minQuantity = dto.minQuantity ?? stock.minQuantity;
    stock.latestPurchasePrice =
      dto.latestPurchasePrice ?? stock.latestPurchasePrice;
    stock.latestPurchaseDate =
      dto.latestPurchaseDate ?? stock.latestPurchaseDate;
    stock.expiryDate = dto.expiryDate ?? stock.expiryDate;
    stock.memo = dto.memo ?? stock.memo;

    return this.stockRepository.save(stock);
  }

  async remove(id: string): Promise<void> {
    const stock = await this.findOne(id);
    await this.stockRepository.remove(stock);
  }

  private async createAdjustment(
    stock: Stock,
    type: StockAdjustmentType,
    quantityBefore: number,
    quantityAfter: number,
    extra: {
      reason?: string | null;
      remarks?: string | null;
      createdBy?: User | null;
    },
  ): Promise<StockAdjustment> {
    const adjustment = this.adjustmentRepository.create({
      stock,
      type,
      quantityBefore,
      quantityAfter,
      delta: quantityAfter - quantityBefore,
      reason: extra.reason ?? null,
      remarks: extra.remarks ?? null,
      createdBy: extra.createdBy ?? null,
    });
    return this.adjustmentRepository.save(adjustment);
  }

  async adjustQuantity(id: string, dto: AdjustStockDto): Promise<Stock> {
    const stock = await this.findOne(id);
    const quantityBefore = stock.quantity;
    const quantityAfter = Number((quantityBefore + dto.delta).toFixed(2));

    if (quantityAfter < 0) {
      throw new BadRequestException('Resulting quantity cannot be negative');
    }

    const createdBy = await this.ensureUser(dto.createdById);

    stock.quantity = quantityAfter;

    await this.createAdjustment(
      stock,
      dto.type,
      quantityBefore,
      quantityAfter,
      {
        reason: dto.reason ?? null,
        remarks: dto.remarks ?? null,
        createdBy,
      },
    );

    return this.stockRepository.save(stock);
  }

  async listAdjustments(stockId: string): Promise<StockAdjustment[]> {
    await this.findOne(stockId);
    return this.adjustmentRepository.find({
      where: { stock: { id: stockId } },
      order: { createdAt: 'DESC' },
    });
  }
}
