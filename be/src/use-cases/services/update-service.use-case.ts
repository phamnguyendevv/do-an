import { Inject, Injectable } from '@nestjs/common'

import { ServiceEntity } from '@domain/entities/service.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    parama: { id: number; userId: number },
    updatedService: Partial<ServiceEntity>,
  ): Promise<boolean> {
    await this.checkServiceExits(parama)
    return await this.serviceRepository.updateService(parama, updatedService)
  }
  private async checkServiceExits(parama: { id: number }) {
    const service = await this.serviceRepository.findServiceById(parama.id)
    if (!service) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: 'Service not found',
      })
    }
  }
}
