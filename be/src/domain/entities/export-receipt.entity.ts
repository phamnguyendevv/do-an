export interface ExportReceiptItem {
  bookId: number | string
  title: string
  quantity: number
  price?: number
}

export class ExportReceiptEntity {
  public readonly id!: number
  public receiptCode!: string
  public orderId?: string
  public reason!: string
  public exportDate!: Date
  public totalItems!: number
  public note?: string
  public items!: ExportReceiptItem[]
  public createdBy?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}
