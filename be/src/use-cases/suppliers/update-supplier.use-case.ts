import { Inject, Injectable } from '@nestjs/common'

import { SupplierEntity } from '@domain/entities/supplier.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ISupplierRepositoryInterface,
  SUPPLIER_REPOSITORY,
} from '@domain/repositories/supplier.repository.interface'

@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number },
    payload: Partial<SupplierEntity>,
  ): Promise<boolean> {
    const existing = await this.supplierRepository.findSupplierById(params.id)
    if (!existing) {
      throw this.exceptionsService.notFoundException({
        message: 'Supplier not found',
        type: 'SupplierNotFoundException',
      })
    }
    return await this.supplierRepository.updateSupplier(params, payload)
  }
}
