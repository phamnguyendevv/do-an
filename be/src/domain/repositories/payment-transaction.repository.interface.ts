import {
  ICreatePaymentTransactionInput,
  PaymentTransactionEntity,
} from '@domain/entities/payment-transaction.entity'

export const PAYMENT_TRANSACTION_REPOSITORY =
  'PAYMENT_TRANSACTION_REPOSITORY_INTERFACE'

export interface IPaymentTransactionRepositoryInterface {
  findByReferenceCode(
    referenceCode: string,
  ): Promise<PaymentTransactionEntity | null>
  findByOrderId(orderId: number): Promise<PaymentTransactionEntity[]>
  findById(id: number): Promise<PaymentTransactionEntity | null>
  create(
    data: ICreatePaymentTransactionInput,
  ): Promise<PaymentTransactionEntity>
}
