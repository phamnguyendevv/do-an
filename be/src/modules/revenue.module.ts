import { RevenueController } from "@adapters/controllers/revenues/revenues.controller";
import { ORDER_REPOSITORY } from "@domain/repositories/order.repository.interface";
import { PAYMENT_REPOSITORY } from "@domain/repositories/payment.repository.interface";
import { Order } from "@infrastructure/databases/postgressql/entities/order.entity";
import { Payment } from "@infrastructure/databases/postgressql/entities/payment.entity";
import { OrderRepository } from "@infrastructure/databases/postgressql/repositories/order.repository";
import { PaymentRepository } from "@infrastructure/databases/postgressql/repositories/payment.repository";
import { ExceptionsModule } from "@infrastructure/exceptions/exceptions.module";
import { JwtModule } from "@infrastructure/services/jwt/jwt.module";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GetDailyRevenueUseCase } from "@use-cases/revenue/get-daily-revenue.use-case";
import { GetMonthlyRevenueUseCase } from "@use-cases/revenue/get-monthly-revenue.use-case";
import { GetOverviewRevenueUseCase } from "@use-cases/revenue/get-overview-revenue.use-case";
import { GetProviderRevenueUseCase } from "@use-cases/revenue/get-provider-revenue.use-case";
import { GetRevenueByServiceUseCase } from "@use-cases/revenue/get-revenue-by-service.use-case";

@Module ({
    imports: [TypeOrmModule.forFeature([Order, Payment]),
        ExceptionsModule,
        JwtModule
  
  ],
    controllers: [RevenueController],
    providers: [
      {
        provide: ORDER_REPOSITORY,
        useClass: OrderRepository
      },
      {
        provide: PAYMENT_REPOSITORY,
        useClass: PaymentRepository
      },
      GetOverviewRevenueUseCase,
      GetMonthlyRevenueUseCase,
      GetDailyRevenueUseCase,
      GetRevenueByServiceUseCase,
      GetProviderRevenueUseCase
    ],

  })
  export class RevenueModule {}