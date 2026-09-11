export type StockMovementType =
  | 'IMPORT'
  | 'EXPORT'
  | 'SALE'
  | 'RESTOCK'
  | 'ADJUST'

export class StockMovementEntity {
  public readonly id!: number
  public bookId!: number
  public bookTitle!: string
  public type!: StockMovementType
  public quantity!: number
  public beforeStock!: number
  public afterStock!: number
  public referenceCode?: string
  public note?: string
  public createdBy?: string
  public readonly createdAt!: Date
}
