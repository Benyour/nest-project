/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';

const repositoryMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
});

describe('LocationsService', () => {
  let service: LocationsService;
  let repository: jest.Mocked<Repository<Location>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: repositoryMockFactory(),
        },
      ],
    }).compile();

    service = moduleRef.get(LocationsService);
    repository = moduleRef.get(getRepositoryToken(Location));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should list locations with relations ordered', async () => {
    const locations: Location[] = [
      {
        id: 'kitchen',
        name: '厨房',
        description: null,
        sortOrder: 0,
        parent: null,
        children: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    repository.find.mockResolvedValue(locations);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    expect(result).toEqual(locations);
  });

  it('should throw when location not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(
      new NotFoundException('Location missing not found'),
    );
  });

  it('should create location without parent', async () => {
    const created: Location = {
      id: 'storage',
      name: '储物间',
      description: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create({ name: '储物间' });

    expect(repository.create).toHaveBeenCalledWith({
      name: '储物间',
      description: null,
      sortOrder: 0,
      parent: null,
    });
    expect(result).toEqual(created);
  });

  it('should reject update when parent equals id', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'loc-1',
      name: 'Location 1',
      description: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Location);

    await expect(
      service.update('loc-1', {
        parentId: 'loc-1',
      }),
    ).rejects.toThrow(
      new BadRequestException('Location cannot be its own parent'),
    );
  });

  it('should prevent delete when has children', async () => {
    const location: Location = {
      id: 'loc-1',
      name: 'Location 1',
      description: null,
      sortOrder: 0,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findOne.mockResolvedValueOnce(location);
    repository.count.mockResolvedValueOnce(1);

    await expect(service.remove('loc-1')).rejects.toThrow(
      new BadRequestException('Cannot delete location with children'),
    );
  });
});
