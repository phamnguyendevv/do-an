import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class GetDetailServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: { id: number }) {
    const service = await this.serviceRepository.findServiceById(payload.id)
    if (!service) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: 'Service not found',
      })
    }

    return service
  }
}
