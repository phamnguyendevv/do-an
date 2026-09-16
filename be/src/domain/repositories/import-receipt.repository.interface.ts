import { ImportReceiptEntity } from '@domain/entities/import-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchImportReceiptParams {
  size?: number
  page?: number
  search?: string
  supplierId?: number
  supplierName?: string
  startDate?: Date
  endDate?: Date
}

export const IMPORT_RECEIPT_REPOSITORY = 'IMPORT_RECEIPT_REPOSITORY_INTERFACE'

export interface IImportReceiptRepositoryInterface {
  findReceipts(params: ISearchImportReceiptParams): Promise<{
    data: ImportReceiptEntity[]
    pagination: IPaginationParams
  }>
  findReceiptById(id: number): Promise<ImportReceiptEntity | null>
  findReceiptByCode(receiptCode: string): Promise<ImportReceiptEntity | null>
  createReceipt(
    receipt: Partial<ImportReceiptEntity>,
  ): Promise<ImportReceiptEntity>
  count(): Promise<number>
}
