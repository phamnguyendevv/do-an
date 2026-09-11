export interface StockAuditItemEntity {
  bookId: number
  title: string
  systemStock: number
  actualStock: number
  diffQuantity: number
  reason?: string
}

export enum StockAuditStatusEnum {
  Draft = 'DRAFT',
  Balanced = 'BALANCED',
}

export class StockAuditEntity {
  public readonly id!: number
  public auditCode!: string
  public title!: string
  public auditDate!: string
  public status!: StockAuditStatusEnum | 'DRAFT' | 'BALANCED'
  public items!: StockAuditItemEntity[]
  public totalSystemStock!: number
  public totalActualStock!: number
  public totalDiff!: number
  public note?: string
  public auditedBy!: string
  public balancedAt?: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export interface StockAuditItemInput {
  bookId: number
  title: string
  systemStock: number
  actualStock: number
  reason?: string
}

export interface CreateStockAuditInput {
  title?: string
  auditDate?: string
  note?: string
  items?: StockAuditItemInput[]
  auditedBy?: string
}
