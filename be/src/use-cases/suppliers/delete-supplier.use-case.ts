import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ISupplierRepositoryInterface,
  SUPPLIER_REPOSITORY,
} from '@domain/repositories/supplier.repository.interface'

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<boolean> {
    const existing = await this.supplierRepository.findSupplierById(params.id)
    if (!existing) {
      throw this.exceptionsService.notFoundException({
        message: 'Supplier not found',
        type: 'SupplierNotFoundException',
      })
    }
    return await this.supplierRepository.deleteSupplier(params)
  }
}
