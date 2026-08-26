export enum PaymentMethodEnum {
  Stripe = 1,
}

export enum PaymentStatusEnum {
  Pending = 1,
  Paid = 2,
  Cancelled = 3,
  Refunded = 4,
  RefundPending = 5,
}
export class PaymentEntity {
  public readonly id!: number
  public stripeCustomerId?: string
  public stripeInvoiceId?: string
  public customerEmail?: string
  public amount!: number
  public currency!: string
  public status!: PaymentStatusEnum
  public method?: PaymentMethodEnum
  public paymentDate?: Date
  public refundAmount?: number
  public refundDate?: Date
  public orderId?: number
  public invoiceId?: string
  public sessionId?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

export class CheckoutSessionEntity {
  public appointmentId!: string
  public userId!: string
  public cancelUrl!: string
  public name!: string
  public description!: string
  public successUrl!: string
  public customerId?: string
  public customerEmail?: string
  public amount!: number
  public currency?: string
  public method?: PaymentMethodEnum
  public paymentDate?: Date
  public refundAmount?: number
  public refundDate?: Date
  public invoiceId?: string
}
