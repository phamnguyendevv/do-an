import { ExportReceiptEntity } from '@domain/entities/export-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchExportReceiptParams {
  size?: number
  page?: number
  search?: string
  reason?: string
  orderId?: number
  startDate?: Date
  endDate?: Date
}

export const EXPORT_RECEIPT_REPOSITORY = 'EXPORT_RECEIPT_REPOSITORY_INTERFACE'

export interface IExportReceiptRepositoryInterface {
  findReceipts(params: ISearchExportReceiptParams): Promise<{
    data: ExportReceiptEntity[]
    pagination: IPaginationParams
  }>
  findReceiptById(id: number): Promise<ExportReceiptEntity | null>
  findReceiptByCode(receiptCode: string): Promise<ExportReceiptEntity | null>
  createReceipt(
    receipt: Partial<ExportReceiptEntity>,
  ): Promise<ExportReceiptEntity>
  count(): Promise<number>
}
