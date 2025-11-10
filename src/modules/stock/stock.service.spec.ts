/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
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
import { StockService } from './stock.service';

type MockRepository = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createQB = <T>(options: {
  many?: T[];
  one?: T | null;
}): jest.Mocked<SelectQueryBuilder<T>> => {
  const qb: Partial<jest.Mocked<SelectQueryBuilder<T>>> = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(options.many ?? []),
    getOne: jest.fn().mockResolvedValue(options.one ?? null),
  };
  return qb as jest.Mocked<SelectQueryBuilder<T>>;
};

describe('StockService', () => {
  let service: StockService;
  let stockRepository: MockRepository;
  let adjustmentRepository: MockRepository & { find: jest.Mock };
  let itemsRepository: MockRepository;
  let locationsRepository: { findOne: jest.Mock };
  let usersRepository: { findOne: jest.Mock };

  const mockItem: Item = {
    id: 'item-1',
    name: '牛奶',
    code: 'MILK',
    brand: null,
    specification: null,
    unit: '瓶',
    shelfLifeDays: null,
    imageUrl: null,
    remarks: null,
    category: {} as Item['category'],
    defaultLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLocation: Location = {
    id: 'loc-1',
    name: '厨房',
    description: null,
    sortOrder: 0,
    parent: null,
    children: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStock: Stock = {
    id: 'stock-1',
    item: mockItem,
    location: mockLocation,
    quantity: 5,
    minQuantity: 1,
    latestPurchasePrice: 20,
    latestPurchaseDate: null,
    expiryDate: null,
    memo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: getRepositoryToken(Stock),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StockAdjustment),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Item),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(StockService);
    stockRepository = moduleRef.get(getRepositoryToken(Stock));
    adjustmentRepository = moduleRef.get(getRepositoryToken(StockAdjustment));
    itemsRepository = moduleRef.get(getRepositoryToken(Item));
    locationsRepository = moduleRef.get(getRepositoryToken(Location));
    usersRepository = moduleRef.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  it('should list stocks with filters', async () => {
    const qb = createQB<Stock>({ many: [mockStock] });
    stockRepository.createQueryBuilder.mockReturnValue(qb);

    const query: ListStockQueryDto = { itemId: 'item-1', lowStockOnly: true };
    const result = await service.findAll(query);

    expect(stockRepository.createQueryBuilder).toHaveBeenCalledWith('stock');
    expect(qb.andWhere).toHaveBeenCalled();
    expect(result).toEqual([mockStock]);
  });

  it('should throw when stock not found', async () => {
    stockRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      new NotFoundException('Stock missing not found'),
    );
  });

  it('should create stock and initial adjustment', async () => {
    const dto: CreateStockDto = {
      itemId: 'item-1',
      locationId: 'loc-1',
      quantity: 10,
      minQuantity: 2,
    };

    itemsRepository.findOne.mockResolvedValue(mockItem);
    locationsRepository.findOne.mockResolvedValue(mockLocation);
    stockRepository.createQueryBuilder.mockReturnValue(
      createQB<Stock>({ one: null }),
    );
    stockRepository.create.mockReturnValue(mockStock);
    stockRepository.save.mockResolvedValue(mockStock);
    adjustmentRepository.create.mockReturnValue({});
    adjustmentRepository.save.mockResolvedValue({});

    const result = await service.create(dto);

    expect(result).toEqual(mockStock);
    expect(adjustmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quantityBefore: 0,
        quantityAfter: 10,
        type: StockAdjustmentType.MANUAL,
      }),
    );
  });

  it('should prevent duplicate stock pair', async () => {
    const dto: CreateStockDto = {
      itemId: 'item-1',
      locationId: 'loc-1',
      quantity: 5,
    };

    itemsRepository.findOne.mockResolvedValue(mockItem);
    locationsRepository.findOne.mockResolvedValue(mockLocation);
    const qb = createQB<Stock>({ one: mockStock });
    stockRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException(
        'Stock record for this item and location already exists',
      ),
    );
  });

  it('should adjust stock quantity', async () => {
    stockRepository.findOne.mockResolvedValue({ ...mockStock });
    adjustmentRepository.create.mockReturnValue({});
    adjustmentRepository.save.mockResolvedValue({});
    stockRepository.save.mockImplementation((value: Stock) => value);

    const dto: AdjustStockDto = {
      type: StockAdjustmentType.MANUAL,
      delta: -2,
    };

    const result = await service.adjustQuantity('stock-1', dto);
    expect(result.quantity).toBe(3);
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('should validate createdBy user when provided', async () => {
    stockRepository.findOne.mockResolvedValue({ ...mockStock });
    usersRepository.findOne.mockResolvedValue({ id: 'user-1' } as User);
    adjustmentRepository.create.mockReturnValue({});
    adjustmentRepository.save.mockResolvedValue({});
    stockRepository.save.mockImplementation((value: Stock) => value);

    const dto: AdjustStockDto = {
      type: StockAdjustmentType.MANUAL,
      delta: 1,
      createdById: 'user-1',
    };

    await service.adjustQuantity('stock-1', dto);
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('should throw when createdBy user missing', async () => {
    stockRepository.findOne.mockResolvedValue({ ...mockStock });
    usersRepository.findOne.mockResolvedValue(null);

    const dto: AdjustStockDto = {
      type: StockAdjustmentType.MANUAL,
      delta: 1,
      createdById: 'user-missing',
    };

    await expect(service.adjustQuantity('stock-1', dto)).rejects.toThrow(
      new BadRequestException('User user-missing not found'),
    );
  });

  it('should reject negative resulting quantity', async () => {
    stockRepository.findOne.mockResolvedValue({ ...mockStock });

    const dto: AdjustStockDto = {
      type: StockAdjustmentType.MANUAL,
      delta: -10,
    };

    await expect(service.adjustQuantity('stock-1', dto)).rejects.toThrow(
      new BadRequestException('Resulting quantity cannot be negative'),
    );
  });

  it('should update stock and record adjustment when quantity changes', async () => {
    stockRepository.findOne.mockResolvedValue({ ...mockStock });
    itemsRepository.findOne.mockResolvedValue(mockItem);
    const qb = createQB<Stock>({ one: null });
    stockRepository.createQueryBuilder.mockReturnValue(qb);
    adjustmentRepository.create.mockReturnValue({});
    adjustmentRepository.save.mockResolvedValue({});
    stockRepository.save.mockImplementation((value: Stock) => value);

    const dto: UpdateStockDto = {
      quantity: 8,
      memo: '手动调整',
    };

    const updated = await service.update('stock-1', dto);
    expect(updated.quantity).toBe(8);
    expect(adjustmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ quantityBefore: 5, quantityAfter: 8 }),
    );
  });
});
