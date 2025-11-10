import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { StockAdjustment } from '../stock/entities/stock-adjustment.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockService } from '../stock/stock.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { PurchaseRecordItemDto } from './dto/purchase-record-item.dto';
import { CreatePurchaseRecordDto } from './dto/create-purchase-record.dto';
import { ConfirmPurchaseRecordDto } from './dto/confirm-purchase-record.dto';
import { UpdatePurchaseRecordDto } from './dto/update-purchase-record.dto';
import { PurchaseRecordItem } from './entities/purchase-record-item.entity';
import {
  PurchaseRecord,
  PurchaseRecordStatus,
} from './entities/purchase-record.entity';
import { PurchaseRecordsService } from './purchase-records.service';

describe('PurchaseRecordsService', () => {
  let dataSource: DataSource;
  let service: PurchaseRecordsService;
  let usersRepository: Repository<User>;
  let categoriesRepository: Repository<Category>;
  let locationsRepository: Repository<Location>;
  let itemsRepository: Repository<Item>;
  let stockRepository: Repository<Stock>;

  let user: User;
  let category: Category;
  let location: Location;
  let item: Item;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [
            User,
            Category,
            Location,
            Item,
            Stock,
            StockAdjustment,
            PurchaseRecord,
            PurchaseRecordItem,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          User,
          Category,
          Location,
          Item,
          Stock,
          StockAdjustment,
          PurchaseRecord,
          PurchaseRecordItem,
        ]),
      ],
      providers: [StockService, PurchaseRecordsService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(PurchaseRecordsService);
    usersRepository = moduleRef.get(getRepositoryToken(User));
    categoriesRepository = moduleRef.get(getRepositoryToken(Category));
    locationsRepository = moduleRef.get(getRepositoryToken(Location));
    itemsRepository = moduleRef.get(getRepositoryToken(Item));
    stockRepository = moduleRef.get(getRepositoryToken(Stock));
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);

    user = await usersRepository.save(
      usersRepository.create({
        email: 'test@example.com',
        password: 'hashed',
        name: '测试用户',
        status: UserStatus.ACTIVE,
      }),
    );

    category = await categoriesRepository.save(
      categoriesRepository.create({
        name: '食品',
        sortOrder: 0,
      }),
    );

    location = await locationsRepository.save(
      locationsRepository.create({
        name: '厨房',
        sortOrder: 0,
      }),
    );

    item = await itemsRepository.save(
      itemsRepository.create({
        name: '牛奶',
        category,
        unit: '瓶',
        shelfLifeDays: 30,
        defaultLocation: location,
      }),
    );
  });

  const buildItems = (overrides: Partial<PurchaseRecordItemDto> = {}) => [
    {
      itemId: item.id,
      locationId: location.id,
      quantity: 2,
      unitPrice: 12.5,
      expiryDate: '2025-03-01',
      ...overrides,
    } satisfies PurchaseRecordItemDto,
  ];

  const buildCreateDto = (
    overrides: Partial<CreatePurchaseRecordDto> = {},
  ) => ({
    code: 'PO-0001',
    createdById: user.id,
    purchaseDate: '2025-01-01',
    storeName: '永辉超市',
    items: buildItems(),
    ...overrides,
  });

  describe('create', () => {
    it('should create draft purchase record with items', async () => {
      const dto = buildCreateDto();
      const record = await service.create(dto);

      expect(record.id).toBeDefined();
      expect(record.status).toBe(PurchaseRecordStatus.DRAFT);
      expect(record.items).toHaveLength(1);
      expect(record.totalAmount).toBeCloseTo(25);
    });

    it('should reject duplicate code', async () => {
      await service.create(buildCreateDto());
      await expect(service.create(buildCreateDto())).rejects.toThrow(
        new BadRequestException('Purchase record code PO-0001 already exists'),
      );
    });
  });

  describe('update/remove', () => {
    it('should update draft record and replace items', async () => {
      const record = await service.create(buildCreateDto());
      const dto: UpdatePurchaseRecordDto = {
        storeName: '山姆会员店',
        items: buildItems({ quantity: 3, unitPrice: 10 }),
      };

      const updated = await service.update(record.id, dto);
      expect(updated.storeName).toBe('山姆会员店');
      expect(updated.items).toHaveLength(1);
      expect(updated.totalAmount).toBe(30);
    });

    it('should prevent deleting confirmed record', async () => {
      const record = await service.create(buildCreateDto());
      await service.confirm(record.id, {});

      await expect(service.remove(record.id)).rejects.toThrow(
        new BadRequestException('Only draft purchase records can be deleted'),
      );
    });
  });

  describe('confirm', () => {
    it('should confirm draft and create stock when missing', async () => {
      const record = await service.create(buildCreateDto());

      const confirmed = await service.confirm(record.id, {
        confirmedById: user.id,
        remarks: '已验收',
      } satisfies ConfirmPurchaseRecordDto);

      expect(confirmed.status).toBe(PurchaseRecordStatus.CONFIRMED);
      const stocks = await stockRepository.find({
        relations: ['item', 'location'],
      });
      expect(stocks).toHaveLength(1);
      expect(stocks[0].quantity).toBe(2);
    });

    it('should increase existing stock quantity on confirm', async () => {
      const existingStock = await stockRepository.save(
        stockRepository.create({
          item,
          location,
          quantity: 5,
          minQuantity: 0,
        }),
      );

      const record = await service.create(
        buildCreateDto({
          code: 'PO-0002',
          items: buildItems({ quantity: 4, unitPrice: 10 }),
        }),
      );

      await service.confirm(record.id, {});

      const stock = await stockRepository.findOneOrFail({
        where: { id: existingStock.id },
      });
      expect(stock.quantity).toBe(9);
    });

    it('should reject confirming non-draft record', async () => {
      const record = await service.create(buildCreateDto());
      await service.confirm(record.id, {});

      await expect(service.confirm(record.id, {})).rejects.toThrow(
        new BadRequestException('Only draft purchase records can be confirmed'),
      );
    });

    it('should throw if record not found', async () => {
      await expect(service.findOne('missing')).rejects.toThrow(
        new NotFoundException('Purchase record missing not found'),
      );
    });
  });
});
