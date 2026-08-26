import { EntityManager } from 'typeorm'

import { ProviderProfileEntity } from '@domain/entities/provider-profile.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { ProviderStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

export interface ISearchProviderParams {
  id?: number
  userId?: number
  size?: number
  page?: number
  status?: ProviderStatusEnum
  businessName?: string
  commissionRate?: number
  search?: string
}

export const PROVIDER_PROFILE_REPOSITORY =
  'PROVIDER_PROFILE_REPOSITORY_INTERFACE'

export interface IProviderProfileRepositoryInterface {
  findProviders(
    queryParams: ISearchProviderParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }>
  createProvider(
    providerProfile: Partial<ProviderProfileEntity>,
    manager?: EntityManager,
  ): Promise<ProviderProfileEntity>
  getProviderByUserId(userId: number): Promise<ProviderProfileEntity | null>
  updateProvider(
    userId: number,
    providerProfile: Partial<ProviderProfileEntity>,
  ): Promise<boolean>
  deleteProvider(id: number): Promise<boolean>
}
