/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Location } from '../locations/entities/location.entity';
import { Tag } from '../tags/entities/tag.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items.query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { ItemsService } from './items.service';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<
    'findOne' | 'create' | 'save' | 'remove' | 'createQueryBuilder' | 'find',
    jest.Mock
  >
> & {
  createQueryBuilder?: jest.Mocked<SelectQueryBuilder<T>>;
};

const createQueryBuilderMock = <T extends ObjectLiteral>(result: T[]) => {
  const qb: Partial<jest.Mocked<SelectQueryBuilder<T>>> = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] ?? null),
    distinct: jest.fn().mockReturnThis(),
  };
  return qb as jest.Mocked<SelectQueryBuilder<T>>;
};

describe('ItemsService', () => {
  let service: ItemsService;
  let itemsRepository: MockRepository<Item>;
  let categoriesRepository: MockRepository<Category>;
  let locationsRepository: MockRepository<Location>;
  let tagsRepository: MockRepository<Tag>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(Item),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ItemsService);
    itemsRepository = moduleRef.get(getRepositoryToken(Item));
    categoriesRepository = moduleRef.get(getRepositoryToken(Category));
    locationsRepository = moduleRef.get(getRepositoryToken(Location));
    tagsRepository = moduleRef.get(getRepositoryToken(Tag));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockCategory: Category = {
    id: 'cat-1',
    name: '食品',
    icon: null,
    sortOrder: 0,
    parent: null,
    children: [],
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

  const mockItem: Item = {
    id: 'item-1',
    name: '牛奶',
    code: 'MILK-001',
    brand: '品牌A',
    specification: '1L',
    unit: '瓶',
    shelfLifeDays: 30,
    imageUrl: null,
    remarks: null,
    category: mockCategory,
    defaultLocation: mockLocation,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTag: Tag = {
    id: 'tag-1',
    name: '常用',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  it('should list items with filters applied', async () => {
    const qb = createQueryBuilderMock<Item>([mockItem]);
    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const query: ListItemsQueryDto = {
      categoryId: 'cat-1',
      keyword: '牛奶',
      tagIds: ['tag-1'],
    };

    const result = await service.findAll(query);

    expect(itemsRepository.createQueryBuilder).toHaveBeenCalledWith('item');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'item.category',
      'category',
    );
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('item.tags', 'tag');
    expect(qb.addOrderBy).toHaveBeenCalled();
    expect(qb.distinct).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalled();
    expect(result).toEqual([mockItem]);
  });

  it('should throw when item not found', async () => {
    (itemsRepository.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      new NotFoundException('Item missing not found'),
    );
  });

  it('should create item successfully', async () => {
    const dto: CreateItemDto = {
      categoryId: 'cat-1',
      name: '牛奶',
      unit: '瓶',
      code: 'MILK-001',
      defaultLocationId: 'loc-1',
      tagIds: ['tag-1'],
    };

    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      createQueryBuilderMock<Item>([]),
    );
    (categoriesRepository.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (locationsRepository.findOne as jest.Mock).mockResolvedValue(mockLocation);
    (tagsRepository.find as jest.Mock).mockResolvedValue([mockTag]);
    (itemsRepository.create as jest.Mock).mockReturnValue(mockItem);
    (itemsRepository.save as jest.Mock).mockImplementation(
      (value: Item) => value,
    );

    const result = await service.create(dto);
    expect(result).toEqual(mockItem);
    expect(itemsRepository.create).toHaveBeenCalledWith({
      name: '牛奶',
      code: 'MILK-001',
      brand: null,
      specification: null,
      unit: '瓶',
      shelfLifeDays: null,
      imageUrl: null,
      remarks: null,
      category: mockCategory,
      defaultLocation: mockLocation,
      tags: [mockTag],
    });
  });

  it('should throw when tag not found', async () => {
    const dto: CreateItemDto = {
      categoryId: 'cat-1',
      name: '牛奶',
      unit: '瓶',
      tagIds: ['missing-tag'],
    };

    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      createQueryBuilderMock<Item>([]),
    );
    (categoriesRepository.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (locationsRepository.findOne as jest.Mock).mockResolvedValue(null);
    (tagsRepository.find as jest.Mock).mockResolvedValue([]);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('Tag(s) not found: missing-tag'),
    );
  });

  it('should reject creation when category missing', async () => {
    const dto: CreateItemDto = {
      categoryId: 'cat-unknown',
      name: '牛奶',
      unit: '瓶',
    };

    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      createQueryBuilderMock<Item>([]),
    );
    (categoriesRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('Category cat-unknown not found'),
    );
  });

  it('should prevent duplicate item code', async () => {
    const dto: CreateItemDto = {
      categoryId: 'cat-1',
      name: '牛奶',
      unit: '瓶',
      code: 'MILK-001',
    };

    const qb = createQueryBuilderMock<Item>([mockItem]);
    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('Item code MILK-001 already exists'),
    );
  });

  it('should update item and keep uniqueness checks', async () => {
    (itemsRepository.findOne as jest.Mock).mockResolvedValue({ ...mockItem });

    const qb = createQueryBuilderMock<Item>([]);
    (itemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    (categoriesRepository.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (tagsRepository.find as jest.Mock).mockResolvedValue([mockTag]);

    const dto: UpdateItemDto = {
      name: '有机牛奶',
      categoryId: 'cat-1',
      code: 'MILK-002',
      tagIds: ['tag-1'],
    };

    (itemsRepository.save as jest.Mock).mockImplementation(
      (value: Item) => value,
    );

    const result = await service.update('item-1', dto);
    expect(result.name).toBe('有机牛奶');
    expect(result.code).toBe('MILK-002');
    expect(result.tags).toEqual([mockTag]);
  });

  it('should remove item', async () => {
    (itemsRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
    (itemsRepository.remove as jest.Mock).mockResolvedValue(undefined);

    await service.remove('item-1');
    expect(itemsRepository.remove).toHaveBeenCalledWith(mockItem);
  });
});
