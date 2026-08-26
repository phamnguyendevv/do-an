import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { IPaginationParams } from '@domain/entities/search.entity'
import { ServiceEntity } from '@domain/entities/service.entity'
import {
  ISearchServiceParams,
  IServiceRepositoryInterface,
} from '@domain/repositories/service.repository.interface'

import { Service } from '../entities/service.entity'

@Injectable()
export class ServiceRepository implements IServiceRepositoryInterface {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async createService(service: ServiceEntity): Promise<ServiceEntity> {
    const created = this.serviceRepository.create(service)
    const saved = await this.serviceRepository.save(created)
    return saved
  }

  async updateService(
    params: {
      id: number
      userId: number
    },
    service: Partial<ServiceEntity>,
  ): Promise<boolean> {
    const updated = await this.serviceRepository.update(
      { id: params.id, providerId: params.userId },
      service,
    )

    if (updated.affected === 0) return false
    return true
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await this.serviceRepository.update(id, { isDeleted: true })

    if (result.affected === 0) return false
    return true
  }

  async findServiceById(id: number): Promise<ServiceEntity | null> {
    const service = await this.serviceRepository
      .createQueryBuilder('service')
      .leftJoin('service.provider', 'provider')
      .leftJoin('service.category', 'category')
      .select([
        'service.id',
        'service.name',
        'service.price',
        'service.description',
        'service.duration',
        'service.imageUrl',
        'provider.id',
        'provider.username',
        'provider.email',
        'provider.avatarUrl',
        'provider.avatarPublicId',
        'provider.addressProvince',
        'provider.addressDistrict',
        'provider.addressWard',
        'provider.addressDetail',
        'provider.role',
        'provider.status',
        'category.id',
        'category.name',
        'category.description',
      ])
      .where('service.id = :id', { id })
      .andWhere('service.isDeleted = false')
      .getOne()

    return service ?? null
  }

  async findOnService(payload: {
    id: number
    userId: number
  }): Promise<ServiceEntity | null> {
    const service = await this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.provider', 'provider')
      .leftJoinAndSelect('service.category', 'category')
      .where('service.id = :id', { id: payload.id })
      .andWhere('provider.id = :providerId', { providerId: payload.userId })
      .andWhere('service.isDeleted = false')
      .getOne()

    return service ?? null
  }

  async findServices(
    queryParams: ISearchServiceParams,
  ): Promise<{ data: ServiceEntity[]; pagination: IPaginationParams }> {
    const {
      id,
      search,
      minPrice,
      maxPrice,
      description,
      duration,
      providerId,
      categoryId,
    } = queryParams
    const page = queryParams.page || 1
    const size = queryParams.size || 100

    const queryBuilder = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.provider', 'provider')
      .leftJoinAndSelect('provider.providerProfile', 'providerProfile')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('service.reviews', 'reviews')
      .where('service.isDeleted = :isDeleted', { isDeleted: false })

    if (id) {
      queryBuilder.andWhere('service.id = :id', { id })
    }

    if (search) {
      queryBuilder.andWhere(
        'service.name ILIKE :search OR service.description ILIKE :search',
        { search: `%${search}%` },
      )
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('service.price >= :minPrice', { minPrice })
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('service.price <= :maxPrice', { maxPrice })
    }

    if (description) {
      queryBuilder.andWhere('service.description ILIKE :description', {
        description: `%${description}%`,
      })
    }

    if (duration !== undefined) {
      queryBuilder.andWhere('service.duration = :duration', { duration })
    }

    if (providerId) {
      queryBuilder.andWhere('provider.id = :providerId', { providerId })
    }

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId })
    }

    queryBuilder.take(size).skip((page - 1) * size)

    const [data, total] = await queryBuilder.getManyAndCount()

    const pagination: IPaginationParams = {
      total,
      page,
      size,
    }

    return {
      data,
      pagination,
    }
  }
}
