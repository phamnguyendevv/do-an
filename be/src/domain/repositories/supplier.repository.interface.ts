import { IPaginationParams } from '@domain/entities/search.entity'
import { SupplierEntity } from '@domain/entities/supplier.entity'

export interface ISearchSupplierParams {
  size?: number
  search?: string
  page?: number
}

export const SUPPLIER_REPOSITORY = 'SUPPLIER_REPOSITORY_INTERFACE'

export interface ISupplierRepositoryInterface {
  findSuppliers(queryParams: ISearchSupplierParams): Promise<{
    data: SupplierEntity[]
    pagination: IPaginationParams
  }>
  createSupplier(supplier: Partial<SupplierEntity>): Promise<SupplierEntity>
  updateSupplier(
    params: { id: number },
    supplier: Partial<SupplierEntity>,
  ): Promise<boolean>
  deleteSupplier(params: { id: number }): Promise<boolean>
  findSupplierById(id: number): Promise<SupplierEntity | null>
}
