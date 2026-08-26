import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class DeleteServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<boolean> {
    await this.checkCategoryExistence(params.id)

    return await this.serviceRepository.deleteService(params.id)
  }
  private async checkCategoryExistence(categoryId: number) {
    const service = await this.serviceRepository.findServiceById(categoryId)
    if (!service) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: 'Service not found',
      })
    }
  }
}
