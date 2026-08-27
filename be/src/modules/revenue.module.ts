import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RevenueController } from '@adapters/controllers/revenues/revenues.controller'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

import { GetDailyRevenueUseCase } from '@use-cases/revenue/get-daily-revenue.use-case'
import { GetMonthlyRevenueUseCase } from '@use-cases/revenue/get-monthly-revenue.use-case'
import { GetOverviewRevenueUseCase } from '@use-cases/revenue/get-overview-revenue.use-case'
import { GetTopSellingBooksUseCase } from '@use-cases/revenue/get-top-books.use-case'

@Module({
  imports: [
    TypeOrmModule.forFeature([BookstoreOrder]),
    CaslModule,
    ExceptionsModule,
  ],
  controllers: [RevenueController],
  providers: [
    GetOverviewRevenueUseCase,
    GetMonthlyRevenueUseCase,
    GetDailyRevenueUseCase,
    GetTopSellingBooksUseCase,
  ],
})
export class RevenueModule {}