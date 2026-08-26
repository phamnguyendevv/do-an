import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface'
import { INVOICE_REPOSITORY } from '@domain/repositories/invoice.repository.interface'
import { ORDER_REPOSITORY } from '@domain/repositories/order.repository.interface'
import { PAYMENT_REPOSITORY } from '@domain/repositories/payment.repository.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'
import { STRIPE_SERVICE } from '@domain/services/stripe.interface'

import { CreateInvoiceFromOrderUseCase } from '@use-cases/invoices/create-invoice-from-order.use-case'
import { CreateCheckoutSessionUseCase } from '@use-cases/payment/create-checkout-session.use-case'
import { GetStatusSessionUseCase } from '@use-cases/payment/get-status-session.use-case'
import { HandleWebhookUseCase } from '@use-cases/payment/handle-webhook.use-case'
import { RefundPaymentUseCase } from '@use-cases/payment/refund-paymnet.use-case'

import { PaymentController } from '@adapters/controllers/payments/payment.controller'

import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { Appointment } from '@infrastructure/databases/postgressql/entities/appointment.entity'
import { Invoice } from '@infrastructure/databases/postgressql/entities/invoice.entity'
import { Order } from '@infrastructure/databases/postgressql/entities/order.entity'
import { Payment } from '@infrastructure/databases/postgressql/entities/payment.entity'
import { User } from '@infrastructure/databases/postgressql/entities/user.entity'
import { AppointmentRepository } from '@infrastructure/databases/postgressql/repositories/appointment.repository'
import { InvoiceRepository } from '@infrastructure/databases/postgressql/repositories/invoice.repository'
import { OrderRepository } from '@infrastructure/databases/postgressql/repositories/order.repository'
import { PaymentRepository } from '@infrastructure/databases/postgressql/repositories/payment.repository'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'
import { StripeModule } from '@infrastructure/services/stripe/stripe.module'
import { StripeService } from '@infrastructure/services/stripe/stripe.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, User, Appointment, Order, Invoice]),
    ExceptionsModule,
    EnvironmentConfigModule,
    StripeModule,
    CaslModule,
  ],

  controllers: [PaymentController],
  providers: [
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PaymentRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: AppointmentRepository,
    },
    {
      provide: MAILER_SERVICE,
      useClass: NodeMailerService,
    },
    {
      provide: STRIPE_SERVICE,
      useClass: StripeService,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderRepository,
    },
    {
      provide: INVOICE_REPOSITORY,
      useClass: InvoiceRepository,
    },
    HandleWebhookUseCase,
    CreateCheckoutSessionUseCase,
    GetStatusSessionUseCase,
    RefundPaymentUseCase,
    CreateInvoiceFromOrderUseCase,
  ],
})
export class PaymentsModule {}
