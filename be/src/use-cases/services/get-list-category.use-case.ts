import { Inject, Injectable } from '@nestjs/common'

import { IPaginationParams } from '@domain/entities/search.entity'
import { ServiceEntity } from '@domain/entities/service.entity'
import {
  ISearchServiceParams,
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'

@Injectable()
export class GetListServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
  ) {}

  async execute(queryParams: ISearchServiceParams): Promise<{
    data: ServiceEntity[]
    pagination: IPaginationParams
  }> {
    return await this.serviceRepository.findServices(queryParams)
  }
}
