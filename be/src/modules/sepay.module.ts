import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { BOOKSTORE_ORDER_REPOSITORY } from '@domain/repositories/bookstore-order.repository.interface'
import { PAYMENT_TRANSACTION_REPOSITORY } from '@domain/repositories/payment-transaction.repository.interface'
import { PAYMENT_GATEWAY } from '@domain/services/payment-gateway.interface'

import { GetSepayOrderStatusUseCase } from '@use-cases/orders/get-sepay-order-status.use-case'
import { ProcessSepayPaymentUseCase } from '@use-cases/orders/process-sepay-payment.use-case'

import { SePayController } from '@adapters/controllers/payment/sepay.controller'
import { PaymentGateway } from '@adapters/gateways/payment/payment.gateway'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { PaymentTransaction } from '@infrastructure/databases/postgresql/entities/payment-transaction.entity'
import { BookstoreOrderRepository } from '@infrastructure/databases/postgresql/repositories/bookstore-order.repository'
import { PaymentTransactionRepository } from '@infrastructure/databases/postgresql/repositories/payment-transaction.repository'

@Module({
  imports: [TypeOrmModule.forFeature([BookstoreOrder, PaymentTransaction])],
  controllers: [SePayController],
  providers: [
    {
      provide: BOOKSTORE_ORDER_REPOSITORY,
      useClass: BookstoreOrderRepository,
    },
    {
      provide: PAYMENT_TRANSACTION_REPOSITORY,
      useClass: PaymentTransactionRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: PaymentGateway,
    },
    GetSepayOrderStatusUseCase,
    ProcessSepayPaymentUseCase,
    PaymentGateway,
  ],
  exports: [PaymentGateway, PAYMENT_GATEWAY],
})
export class SePayModule {}
