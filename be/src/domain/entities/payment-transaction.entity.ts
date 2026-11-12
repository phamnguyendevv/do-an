export type PaymentTransactionStatus =
  | 'SUCCESS'
  | 'AUTO_CREATED'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'IGNORED'

/**
 * Domain entity cho PaymentTransaction.
 * Dùng để ghi vết SePay Webhook và đảm bảo idempotency.
 */
export class PaymentTransactionEntity {
  public readonly id!: number
  /** Mã tham chiếu duy nhất từ SePay/Ngân hàng */
  public referenceCode!: string
  public gateway?: string
  public accountNumber?: string
  public transferAmount!: number
  public orderCode?: string
  public orderId?: number
  public content?: string
  public status!: PaymentTransactionStatus
  public rawPayload?: Record<string, unknown>
  public processedAt!: Date
  public readonly createdAt!: Date
}

export interface ICreatePaymentTransactionInput {
  referenceCode: string
  gateway?: string
  accountNumber?: string
  transferAmount: number
  orderCode?: string
  orderId?: number
  content?: string
  status: PaymentTransactionStatus
  rawPayload?: Record<string, unknown>
}
