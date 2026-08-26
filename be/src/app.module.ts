import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MailerModule } from '@infrastructure/services/mailer/mailer.module'
import { RedisModule } from '@infrastructure/services/redis/redis.module'
import { StripeModule } from '@infrastructure/services/stripe/stripe.module'

import { AppointmentsModule } from '@modules/appointment.module'
import { BooksModule } from '@modules/books.module'
import { CategoriesModule } from '@modules/category.module'
import { GhnModule } from '@modules/ghn.module'
import { InvoiceModule } from '@modules/invoice.module'
import { NotificationModule } from '@modules/notification.module'
import { PaymentsModule } from '@modules/payment.module'
import { RevenueModule } from '@modules/revenue.module'
import { ReviewsModule } from '@modules/review.module'
import { ServicesModule } from '@modules/service.module'
import { SuppliersModule } from '@modules/supplier.module'
import { UsersModule } from '@modules/user.module'

import { MaintenanceMiddleware } from './infrastructure/common/middlewares/maintenance.middleware'
import { JwtRefreshStrategy } from './infrastructure/common/strategies/jwt-refresh.strategy'
import { JwtStrategy } from './infrastructure/common/strategies/jwt.strategy'
import { EnvironmentConfigModule } from './infrastructure/config/environment/environment-config.module'
import { User } from './infrastructure/databases/postgressql/entities/user.entity'
import { UserRepository } from './infrastructure/databases/postgressql/repositories/user.repository'
import { TypeOrmConfigModule } from './infrastructure/databases/postgressql/typeorm.module'
import { ExceptionsModule } from './infrastructure/exceptions/exceptions.module'
import { LoggerModule } from './infrastructure/logger/logger.module'
import { AuthModule } from './modules/auth.module'
import { HealthModule } from './modules/health.module'
import { PromotionsModule } from './modules/promotion.module'

@Module({
  imports: [
    EnvironmentConfigModule,
    MailerModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    LoggerModule,
    RedisModule,
    ExceptionsModule,
    TypeOrmConfigModule,
    TypeOrmModule.forFeature([User]),
    HealthModule,
    AuthModule,
    UsersModule,
    BooksModule,
    CategoriesModule,
    SuppliersModule,
    ServicesModule,
    AppointmentsModule,
    PromotionsModule,
    ReviewsModule,
    PaymentsModule,
    StripeModule,
    NotificationModule,
    RevenueModule,
    InvoiceModule,
    GhnModule,
  ],
  providers: [UserRepository, JwtStrategy, JwtRefreshStrategy],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceMiddleware)
      .exclude({
        version: ['1'],
        path: 'health',
        method: RequestMethod.GET,
      })
      .forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
