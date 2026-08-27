export type OrderHistoryAction =
  | 'CREATED'
  | 'STATUS_CHANGE'
  | 'PAYMENT_CHANGE'
  | 'UPDATED_INFO'
  | 'SEPAY_PAYMENT'
  | 'GHN_SYNC'
  | 'NOTE_ADDED'
  | 'CANCELLED'

export class OrderHistoryEntity {
  public readonly id!: number
  public orderId!: number
  public orderCode!: string
  public action!: OrderHistoryAction | string
  public fromStatus?: string
  public toStatus?: string
  public fromPayment?: string
  public toPayment?: string
  public title!: string
  public note?: string
  public actor!: string
  public actorRole?: string
  public metadata?: Record<string, any>
  public readonly createdAt!: Date
}
