import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { EntityManager, Repository } from 'typeorm'

import { ProviderProfileEntity } from '@domain/entities/provider-profile.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  IProviderProfileRepositoryInterface,
  ISearchProviderParams,
} from '@domain/repositories/provider-profile.respository.interface'

import { ProviderProfile } from '../entities/provider-profile.entity'
import { User } from '../entities/user.entity'

@Injectable()
export class ProviderProfileRepository
  implements IProviderProfileRepositoryInterface
{
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepository: Repository<ProviderProfile>,
  ) {}
  createProvider(
    providerProfile: Partial<ProviderProfile>,
    manager?: EntityManager,
  ): Promise<ProviderProfile> {
    const repository: Repository<ProviderProfile> = manager
      ? manager.getRepository(ProviderProfile)
      : this.providerProfileRepository

    const newProviderProfile = repository.create(providerProfile)
    return repository.save(newProviderProfile)
  }
  getProviderByUserId(userId: number): Promise<ProviderProfileEntity | null> {
    return this.providerProfileRepository.findOne({
      where: { userId: userId },
    })
  }
  async updateProvider(
    userId: number,
    providerProfile: Partial<ProviderProfileEntity>,
  ): Promise<boolean> {
    const result = await this.providerProfileRepository.update(
      { userId },
      providerProfile,
    )
    if (result.affected === 0) return false

    return true
  }

  async findProviders(
    query: ISearchProviderParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }> {
    query.page = query.page || 1
    query.size = query.size || 100

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.providerProfile', 'profile')
      .where('user.role = :role', { role: UserRoleEnum.Provider })

    if (query.id) {
      queryBuilder.andWhere('user.id = :id', { id: query.id })
    }
    if (query.userId) {
      queryBuilder.andWhere('user.id = :userId', { userId: query.userId })
    }
    if (query.status) {
      queryBuilder.andWhere('profile.status = :status', {
        status: query.status,
      })
    }
    if (query.commissionRate) {
      queryBuilder.andWhere('profile.commissionRate = :commissionRate', {
        commissionRate: query.commissionRate,
      })
    }
    if (query.search) {
      queryBuilder.andWhere(
        'user.email ILIKE :search OR user.username ILIKE :search OR profile.businessName ILIKE :search',
        { search: `%${query.search}%` },
      )
    }

    queryBuilder.take(query.size).skip((query.page - 1) * query.size)
    const [data, total] = await queryBuilder.getManyAndCount()

    const pagination: IPaginationParams = {
      total,
      page: query.page,
      size: query.size,
    }

    return { data, pagination }
  }
  async deleteProvider(id: number): Promise<boolean> {
    const result = await this.providerProfileRepository.delete(id)
    return (result.affected ?? 0) > 0
  }
}
