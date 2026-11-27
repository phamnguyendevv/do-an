export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY_INTERFACE'

export interface IPaymentSuccessPayload {
  orderCode: string
  orderId?: number
  amount: number
  paymentStatus: string
  transactionDate?: string
  gateway?: string
}

export interface IPaymentNotificationPayload {
  id: string
  actorId: number
  title: string
  description: string
  module: string
  tone: string
  read: boolean
  route?: string
  createdAt: Date
}

export interface IPaymentGateway {
  emitPaymentSuccess(payload: IPaymentSuccessPayload): void
  emitNotification(
    actorId: number,
    notification: IPaymentNotificationPayload,
  ): void
}
