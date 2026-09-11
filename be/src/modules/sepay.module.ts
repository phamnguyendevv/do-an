import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { BOOKSTORE_ORDER_REPOSITORY } from '@domain/repositories/bookstore-order.repository.interface'

import { GetSepayOrderStatusUseCase } from '@use-cases/orders/get-sepay-order-status.use-case'
import { ProcessSepayPaymentUseCase } from '@use-cases/orders/process-sepay-payment.use-case'

import { SePayController } from '@adapters/controllers/payment/sepay.controller'
import { PaymentGateway } from '@adapters/gateways/payment/payment.gateway'
import { BOOKSTORE_ORDER_REPOSITORY } from '@domain/repositories/bookstore-order.repository.interface'
import { PAYMENT_GATEWAY } from '@domain/services/payment-gateway.interface'
import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { BookstoreOrderRepository } from '@infrastructure/databases/postgresql/repositories/bookstore-order.repository'

@Module({
  imports: [TypeOrmModule.forFeature([BookstoreOrder])],
  controllers: [SePayController],
  providers: [
    {
      provide: BOOKSTORE_ORDER_REPOSITORY,
      useClass: BookstoreOrderRepository,
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
