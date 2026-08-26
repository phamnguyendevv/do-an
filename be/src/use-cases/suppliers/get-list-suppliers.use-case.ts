import { Inject, Injectable } from '@nestjs/common'

import { SupplierEntity } from '@domain/entities/supplier.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  ISearchSupplierParams,
  ISupplierRepositoryInterface,
  SUPPLIER_REPOSITORY,
} from '@domain/repositories/supplier.repository.interface'

@Injectable()
export class GetListSuppliersUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepositoryInterface,
  ) {}

  async execute(queryParams: ISearchSupplierParams): Promise<{
    data: SupplierEntity[]
    pagination: IPaginationParams
  }> {
    return await this.supplierRepository.findSuppliers(queryParams)
  }
}
