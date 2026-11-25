import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SpxController } from '@adapters/controllers/shipping/spx.controller'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { SpxService } from '@infrastructure/services/spx/spx.service'

@Module({
  imports: [TypeOrmModule.forFeature([BookstoreOrder, OrderHistory])],
  controllers: [SpxController],
  providers: [SpxService],
  exports: [SpxService],
})
export class SpxModule {}
