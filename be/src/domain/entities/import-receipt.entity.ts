export interface ImportReceiptItem {
  bookId: number | string
  title: string
  quantity: number
  price: number
}

export class ImportReceiptEntity {
  public readonly id!: number
  public receiptCode!: string
  public supplierId?: number
  public supplierName!: string
  public importDate!: Date
  public totalItems!: number
  public totalValue!: number
  public note?: string
  public items!: ImportReceiptItem[]
  public createdBy?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export interface ImportReceiptLineInput {
  bookId: number | string
  quantity: number
  price: number
}

export interface CreateImportReceiptInput {
  supplierId?: number
  supplierName: string
  importDate?: string
  note?: string
  lines: ImportReceiptLineInput[]
  createdBy?: string
}
