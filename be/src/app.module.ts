import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { PassportModule } from '@nestjs/passport'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MailerModule } from '@infrastructure/services/mailer/mailer.module'
import { RedisModule } from '@infrastructure/services/redis/redis.module'

import { BooksModule } from '@modules/books.module'
import { CategoriesModule } from '@modules/category.module'
import { GhnModule } from '@modules/ghn.module'
import { InventoryModule } from '@modules/inventory.module'
import { NotificationModule } from '@modules/notification.module'
import { OrdersModule } from '@modules/orders.module'
import { RevenueModule } from '@modules/revenue.module'
import { SePayModule } from '@modules/sepay.module'
import { SuppliersModule } from '@modules/supplier.module'
import { UsersModule } from '@modules/user.module'
import { CustomersModule } from '@modules/customers.module'
import { PromotionsModule } from '@modules/promotions.module'
import { ActivityLogsModule } from '@modules/activity-logs.module'

import { MaintenanceMiddleware } from './infrastructure/common/middlewares/maintenance.middleware'
import { JwtRefreshStrategy } from './infrastructure/common/strategies/jwt-refresh.strategy'
import { JwtStrategy } from './infrastructure/common/strategies/jwt.strategy'
import { EnvironmentConfigModule } from './infrastructure/config/environment/environment-config.module'
import { User } from './infrastructure/databases/postgresql/entities/user.entity'
import { UserRepository } from './infrastructure/databases/postgresql/repositories/user.repository'
import { TypeOrmConfigModule } from './infrastructure/databases/postgresql/typeorm.module'
import { ExceptionsModule } from './infrastructure/exceptions/exceptions.module'
import { LoggerModule } from './infrastructure/logger/logger.module'
import { AuthModule } from './modules/auth.module'
import { HealthModule } from './modules/health.module'

@Module({
  imports: [
    EnvironmentConfigModule,
    MailerModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 15,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 120,
      },
    ]),
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
    InventoryModule,
    OrdersModule,
    GhnModule,
    SePayModule,
    RevenueModule,
    NotificationModule,
    CustomersModule,
    PromotionsModule,
    ActivityLogsModule,
  ],
  providers: [
    UserRepository,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
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
