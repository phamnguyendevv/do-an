import { Inject, Injectable } from '@nestjs/common'

import { SupplierEntity } from '@domain/entities/supplier.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ISupplierRepositoryInterface,
  SUPPLIER_REPOSITORY,
} from '@domain/repositories/supplier.repository.interface'

@Injectable()
export class GetDetailSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<SupplierEntity> {
    const supplier = await this.supplierRepository.findSupplierById(params.id)
    if (!supplier) {
      throw this.exceptionsService.notFoundException({
        message: 'Supplier not found',
        type: 'SupplierNotFoundException',
      })
    }
    return supplier
  }
}
