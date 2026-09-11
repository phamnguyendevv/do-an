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

export interface ExportReceiptLineInput {
  bookId: number | string
  quantity: number
  price?: number
}

export interface CreateExportReceiptInput {
  orderId?: string
  reason: string
  exportDate?: string
  note?: string
  lines: ExportReceiptLineInput[]
  createdBy?: string
}
