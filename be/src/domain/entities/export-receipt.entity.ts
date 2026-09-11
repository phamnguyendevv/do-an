export interface ExportReceiptItem {
  bookId: number | string
  title: string
  quantity: number
  price?: number
}

export class ExportReceiptEntity {
  public readonly id!: number
  public receiptCode!: string
  /** ID đơn hàng liên kết (bigint, FK tới bookstore_orders.id) */
  public orderId?: number
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
  /** ID đơn hàng liên kết (bigint). Trước đây là string, giờ là number. */
  orderId?: number
  reason: string
  exportDate?: string
  note?: string
  lines: ExportReceiptLineInput[]
  createdBy?: string
}
