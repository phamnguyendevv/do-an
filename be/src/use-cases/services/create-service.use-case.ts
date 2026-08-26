import { Inject, Injectable } from '@nestjs/common'

import { ServiceEntity } from '@domain/entities/service.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
} from '@domain/repositories/category.repository.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,

    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    queryParams: Partial<ServiceEntity>,
    userId: number,
  ): Promise<ServiceEntity> {
    await this.checkCategoryExistence(queryParams)
    queryParams.providerId = userId

    return await this.serviceRepository.createService(queryParams)
  }

  private async checkCategoryExistence(queryParams: Partial<ServiceEntity>) {
    const category = await this.categoryRepository.findCategoriesById(
      queryParams.categoryId!,
    )
    if (!category) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: 'Service not found',
      })
    }
  }
}
