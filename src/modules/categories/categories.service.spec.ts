/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

const repositoryMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<Repository<Category>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: repositoryMockFactory(),
        },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
    repository = moduleRef.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all categories with relations', async () => {
    const categories: Category[] = [
      {
        id: 'root-id',
        name: '根分类',
        icon: null,
        sortOrder: 0,
        parent: null,
        children: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    repository.find.mockResolvedValue(categories);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    expect(result).toEqual(categories);
  });

  it('should throw when category not found on findOne', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      new NotFoundException('Category missing-id not found'),
    );
  });

  it('should create category with optional parent', async () => {
    const parent: Category = {
      id: 'parent-id',
      name: 'Parent',
      icon: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const created: Category = {
      id: 'new-id',
      name: 'Child',
      icon: null,
      sortOrder: 0,
      parent,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findOne.mockResolvedValueOnce(parent);
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create({
      name: 'Child',
      parentId: 'parent-id',
    });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'parent-id' },
    });
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Child',
      icon: null,
      sortOrder: 0,
      parent,
    });
    expect(result).toEqual(created);
  });

  it('should reject when parent is missing', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'Child',
        parentId: 'missing-parent',
      }),
    ).rejects.toThrow(
      new BadRequestException('Parent category missing-parent not found'),
    );
  });

  it('should reject when category sets itself as parent', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'category-id',
      name: 'Category',
      icon: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Category);

    await expect(
      service.update('category-id', {
        parentId: 'category-id',
      }),
    ).rejects.toThrow(
      new BadRequestException('Category cannot be its own parent'),
    );
  });

  it('should prevent deleting category with children', async () => {
    const category: Category = {
      id: 'category-id',
      name: 'Category',
      icon: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findOne.mockResolvedValueOnce(category);
    repository.count.mockResolvedValueOnce(2);

    await expect(service.remove('category-id')).rejects.toThrow(
      new BadRequestException('Cannot delete category with children'),
    );
  });
});
