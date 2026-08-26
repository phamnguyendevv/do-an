import { Service } from '@infrastructure/databases/postgressql/entities/service.entity'

import { CategoryEntity } from './category.entity'
import { ProviderProfileUserEntity } from './provider-profile.entity'
import { ReviewEntity } from './review.entity'

export interface IServiceWithRating extends Service {
  avgRating?: string
  reviewCount?: string
}

export class ServiceEntity {
  public readonly id!: number
  public name!: string
  public description?: string
  public price!: number
  public duration!: number
  public isActive?: boolean
  public rating?: number
  public reviewCount?: number
  public averageRating?: number
  public categoryId!: number
  public providerId!: number
  public category!: CategoryEntity
  public provider!: ProviderProfileUserEntity
  public review?: ReviewEntity[]
  public imageUrl?: string
  public imagePublicId?: string

  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
