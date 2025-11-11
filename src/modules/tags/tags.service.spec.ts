/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { TagsService } from './tags.service';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<
    'findOne' | 'create' | 'save' | 'remove' | 'createQueryBuilder',
    jest.Mock
  >
> & {
  createQueryBuilder?: jest.Mocked<SelectQueryBuilder<T>>;
};

const createQueryBuilderMock = <T extends ObjectLiteral>(result: T[]) => {
  const qb: Partial<jest.Mocked<SelectQueryBuilder<T>>> = {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] ?? null),
    createQueryBuilder: jest.fn().mockReturnThis(),
  };
  return qb as jest.Mocked<SelectQueryBuilder<T>>;
};

describe('TagsService', () => {
  let service: TagsService;
  let tagsRepository: MockRepository<Tag>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TagsService);
    tagsRepository = moduleRef.get(getRepositoryToken(Tag));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockTag: Tag = {
    id: 'tag-1',
    name: '常用',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  it('should list tags with optional keyword', async () => {
    const qb = createQueryBuilderMock<Tag>([mockTag]);
    (tagsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const result = await service.findAll('常');

    expect(tagsRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
    expect(qb.where).toHaveBeenCalled();
    expect(result).toEqual([mockTag]);
  });

  it('should throw when tag not found', async () => {
    (tagsRepository.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      new NotFoundException('Tag missing not found'),
    );
  });

  it('should create tag with unique name', async () => {
    const qb = createQueryBuilderMock<Tag>([]);
    (tagsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (tagsRepository.create as jest.Mock).mockReturnValue(mockTag);
    (tagsRepository.save as jest.Mock).mockResolvedValue(mockTag);

    const result = await service.create({ name: '常用' });
    expect(result).toEqual(mockTag);
  });

  it('should prevent duplicate tag name', async () => {
    const qb = createQueryBuilderMock<Tag>([mockTag]);
    (tagsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    await expect(service.create({ name: '常用' })).rejects.toThrow(
      new BadRequestException('Tag name 常用 already exists'),
    );
  });

  it('should update tag name with uniqueness check', async () => {
    (tagsRepository.findOne as jest.Mock).mockResolvedValue({ ...mockTag });
    const qb = createQueryBuilderMock<Tag>([]);
    (tagsRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (tagsRepository.save as jest.Mock).mockImplementation(
      (value: Tag) => value,
    );

    const result = await service.update('tag-1', { name: '日常' });
    expect(result.name).toBe('日常');
  });

  it('should remove tag', async () => {
    (tagsRepository.findOne as jest.Mock).mockResolvedValue(mockTag);
    (tagsRepository.remove as jest.Mock).mockResolvedValue(undefined);

    await service.remove('tag-1');
    expect(tagsRepository.remove).toHaveBeenCalledWith(mockTag);
  });
});
