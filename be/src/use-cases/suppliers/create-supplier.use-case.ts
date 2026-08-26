import { Inject, Injectable } from '@nestjs/common'

import { SupplierEntity } from '@domain/entities/supplier.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ISupplierRepositoryInterface,
  SUPPLIER_REPOSITORY,
} from '@domain/repositories/supplier.repository.interface'

@Injectable()
export class CreateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: Partial<SupplierEntity>): Promise<SupplierEntity> {
    if (!payload.name || !payload.name.trim()) {
      throw this.exceptionsService.badRequestException({
        message: 'Supplier name is required',
        type: 'ValidationException',
      })
    }
    return await this.supplierRepository.createSupplier(payload)
  }
}
