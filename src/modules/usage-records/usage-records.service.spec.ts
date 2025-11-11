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
import { Tag } from '../tags/entities/tag.entity';
import { ConfirmUsageRecordDto } from './dto/confirm-usage-record.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { UsageRecordItemDto } from './dto/usage-record-item.dto';
import { UpdateUsageRecordDto } from './dto/update-usage-record.dto';
import { UsageRecordItem } from './entities/usage-record-item.entity';
import {
  UsageRecord,
  UsageRecordStatus,
  UsageRecordType,
} from './entities/usage-record.entity';
import { UsageRecordsService } from './usage-records.service';

describe('UsageRecordsService', () => {
  let dataSource: DataSource;
  let service: UsageRecordsService;
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
            Tag,
            Stock,
            StockAdjustment,
            UsageRecord,
            UsageRecordItem,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          User,
          Category,
          Location,
          Item,
          Tag,
          Stock,
          StockAdjustment,
          UsageRecord,
          UsageRecordItem,
        ]),
      ],
      providers: [StockService, UsageRecordsService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(UsageRecordsService);
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
        email: 'usage@example.com',
        password: 'hashed',
        name: '使用记录测试',
        status: UserStatus.ACTIVE,
      }),
    );

    category = await categoriesRepository.save(
      categoriesRepository.create({ name: '饮品', sortOrder: 0 }),
    );

    location = await locationsRepository.save(
      locationsRepository.create({ name: '厨房', sortOrder: 0 }),
    );

    item = await itemsRepository.save(
      itemsRepository.create({
        name: '酸奶',
        category,
        unit: '瓶',
        defaultLocation: location,
      }),
    );

    await stockRepository.save(
      stockRepository.create({
        item,
        location,
        quantity: 5,
        minQuantity: 1,
      }),
    );
  });

  const buildItems = (overrides: Partial<UsageRecordItemDto> = {}) => [
    {
      itemId: item.id,
      locationId: location.id,
      quantity: 2,
      remarks: '早餐使用',
      ...overrides,
    } satisfies UsageRecordItemDto,
  ];

  const buildCreateDto = (overrides: Partial<CreateUsageRecordDto> = {}) => ({
    usageDate: '2025-02-01',
    type: UsageRecordType.DAILY,
    createdById: user.id,
    items: buildItems(),
    ...overrides,
  });

  describe('create', () => {
    it('should create draft usage record', async () => {
      const record = await service.create(buildCreateDto());
      expect(record.status).toBe(UsageRecordStatus.DRAFT);
      expect(record.items).toHaveLength(1);
    });
  });

  describe('update/remove', () => {
    it('should update draft record and replace items', async () => {
      const record = await service.create(buildCreateDto());
      const dto: UpdateUsageRecordDto = {
        remarks: '午餐使用',
        items: buildItems({ quantity: 1.5 }),
      };

      const updated = await service.update(record.id, dto);
      expect(updated.remarks).toBe('午餐使用');
      expect(updated.items[0].quantity).toBe(1.5);
    });

    it('should prevent removing confirmed record', async () => {
      const record = await service.create(buildCreateDto());
      await service.confirm(record.id, {});

      await expect(service.remove(record.id)).rejects.toThrow(
        new BadRequestException('Only draft usage records can be deleted'),
      );
    });
  });

  describe('confirm', () => {
    it('should confirm draft and deduct stock', async () => {
      const record = await service.create(buildCreateDto());

      const confirmed = await service.confirm(record.id, {
        confirmedById: user.id,
        remarks: '确认扣减',
      } satisfies ConfirmUsageRecordDto);

      expect(confirmed.status).toBe(UsageRecordStatus.CONFIRMED);
      const stock = await stockRepository.findOneByOrFail({
        item: { id: item.id },
        location: { id: location.id },
      });
      expect(stock.quantity).toBe(3);
    });

    it('should reject when stock is insufficient', async () => {
      const record = await service.create(
        buildCreateDto({ items: buildItems({ quantity: 10 }) }),
      );

      await expect(service.confirm(record.id, {})).rejects.toThrow(
        new BadRequestException(
          `Insufficient stock for item ${item.id} at location ${location.id}`,
        ),
      );
    });

    it('should reject confirming non-draft record', async () => {
      const record = await service.create(buildCreateDto());
      await service.confirm(record.id, {});

      await expect(service.confirm(record.id, {})).rejects.toThrow(
        new BadRequestException('Only draft usage records can be confirmed'),
      );
    });

    it('should throw if record not found', async () => {
      await expect(service.findOne('missing')).rejects.toThrow(
        new NotFoundException('Usage record missing not found'),
      );
    });
  });
});
