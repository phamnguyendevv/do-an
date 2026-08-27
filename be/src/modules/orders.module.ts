import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { BOOK_REPOSITORY } from '@domain/repositories/book.repository.interface'
import { BOOKSTORE_ORDER_REPOSITORY } from '@domain/repositories/bookstore-order.repository.interface'
import { ORDER_HISTORY_REPOSITORY } from '@domain/repositories/order-history.repository.interface'
import { STOCK_MOVEMENT_REPOSITORY } from '@domain/repositories/stock-movement.repository.interface'

import { BookstoreOrdersController } from '@adapters/controllers/orders/orders.controller'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'
import { BookRepository } from '@infrastructure/databases/postgresql/repositories/book.repository'
import { BookstoreOrderRepository } from '@infrastructure/databases/postgresql/repositories/bookstore-order.repository'
import { OrderHistoryRepository } from '@infrastructure/databases/postgresql/repositories/order-history.repository'
import { StockMovementRepository } from '@infrastructure/databases/postgresql/repositories/stock-movement.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

import { AddOrderHistoryNoteUseCase } from '@use-cases/orders/add-order-history-note.use-case'
import { CreateBookstoreOrderUseCase } from '@use-cases/orders/create-order.use-case'
import { GetDetailBookstoreOrderUseCase } from '@use-cases/orders/get-detail-order.use-case'
import { GetListBookstoreOrdersUseCase } from '@use-cases/orders/get-list-orders.use-case'
import { GetListOrderHistoriesUseCase } from '@use-cases/orders/get-list-order-histories.use-case'
import { GetOrderHistoriesUseCase } from '@use-cases/orders/get-order-histories.use-case'
import { UpdateBookstoreOrderPaymentUseCase } from '@use-cases/orders/update-order-payment.use-case'
import { UpdateBookstoreOrderStatusUseCase } from '@use-cases/orders/update-order-status.use-case'
import { UpdateBookstoreOrderUseCase } from '@use-cases/orders/update-order.use-case'

@Module({
  imports: [
    TypeOrmModule.forFeature([BookstoreOrder, Book, StockMovement, OrderHistory]),
    CaslModule,
    ExceptionsModule,
  ],
  controllers: [BookstoreOrdersController],
  providers: [
    {
      provide: BOOKSTORE_ORDER_REPOSITORY,
      useClass: BookstoreOrderRepository,
    },
    {
      provide: ORDER_HISTORY_REPOSITORY,
      useClass: OrderHistoryRepository,
    },
    {
      provide: BOOK_REPOSITORY,
      useClass: BookRepository,
    },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: StockMovementRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    GetListBookstoreOrdersUseCase,
    CreateBookstoreOrderUseCase,
    GetDetailBookstoreOrderUseCase,
    UpdateBookstoreOrderStatusUseCase,
    UpdateBookstoreOrderPaymentUseCase,
    UpdateBookstoreOrderUseCase,
    GetOrderHistoriesUseCase,
    GetListOrderHistoriesUseCase,
    AddOrderHistoryNoteUseCase,
  ],
  exports: [BOOKSTORE_ORDER_REPOSITORY, ORDER_HISTORY_REPOSITORY],
})
export class OrdersModule {}
