import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class DeleteMyServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number, userId: number): Promise<boolean> {
    const service = await this.serviceRepository.findOnService({
      id,
      userId,
    })
    if (service?.providerId !== userId) {
      throw this.exceptionsService.forbiddenException({
        type: 'ForbiddenException',
        message: 'You do not have permission to delete this service',
      })
    }

    if (!service) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: 'Service not found',
      })
    }

    return await this.serviceRepository.deleteService(id)
  }
}
