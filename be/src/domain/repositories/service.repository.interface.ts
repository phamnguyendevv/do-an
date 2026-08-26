import { CategoryEntity } from '@domain/entities/category.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { ServiceEntity } from '@domain/entities/service.entity'
import { UserEntity } from '@domain/entities/user.entity'

export interface ISearchServiceParams {
  id?: number
  size?: number
  page?: number
  search?: string
  minPrice?: number
  maxPrice?: number
  description?: string
  duration?: number
  providerId?: number
  categoryId?: number
  category?: CategoryEntity
  provider?: UserEntity
}

export const SERVICE_REPOSITORY = 'SERVICE_REPOSITORY_INTERFACE'

export interface IServiceRepositoryInterface {
  findServices(
    queryParams: ISearchServiceParams,
  ): Promise<{ data: ServiceEntity[]; pagination: IPaginationParams }>
  createService(service: Partial<ServiceEntity>): Promise<ServiceEntity>
  updateService(
    params: {
      id: number
      userId: number
    },
    category: Partial<ServiceEntity>,
  ): Promise<boolean>
  deleteService(id: number): Promise<boolean>
  findServiceById(id: number): Promise<ServiceEntity | null>
  findOnService(payload: {
    id: number
    userId: number
  }): Promise<ServiceEntity | null>
}
