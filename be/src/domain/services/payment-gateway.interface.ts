export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY_INTERFACE'

export interface IPaymentSuccessPayload {
  orderCode: string
  orderId?: number
  amount: number
  paymentStatus: string
  transactionDate?: string
  gateway?: string
}

export interface IPaymentGateway {
  emitPaymentSuccess(payload: IPaymentSuccessPayload): void
}
