import { MailerModule } from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface'
import { PROMOTION_REPOSITORY } from '@domain/repositories/promotion.repository.interface'
import { SERVICE_REPOSITORY } from '@domain/repositories/service.repository.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { CreateAppointmentUseCase } from '@use-cases/appointments/create-appointment.use-case'
import { DeleteAppointmentUseCase } from '@use-cases/appointments/delete-appointment.use-case'
import { GetDetailAppointmentUseCase } from '@use-cases/appointments/get-detali-appointment.use-case'
import { GetListAppointmentByClientUseCase } from '@use-cases/appointments/get-list-appointment-by-client.use-case'
import { GetListAppointmentUseCase } from '@use-cases/appointments/get-list-appointment.use-case'
import { UpdateAppointmentUseCase } from '@use-cases/appointments/update-appointment.use-case'
import { CreateNotificationUseCase } from '@use-cases/notification/create-notification.use-case'

import { AppointmentsController } from '@adapters/controllers/appointments/appointment.controller'

import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { Appointment } from '@infrastructure/databases/postgressql/entities/appointment.entity'
import { Promotion } from '@infrastructure/databases/postgressql/entities/promotion.entity'
import { Service } from '@infrastructure/databases/postgressql/entities/service.entity'
import { User } from '@infrastructure/databases/postgressql/entities/user.entity'
import { AppointmentRepository } from '@infrastructure/databases/postgressql/repositories/appointment.repository'
import { PromotionRepository } from '@infrastructure/databases/postgressql/repositories/promotion.repository'
import { ServiceRepository } from '@infrastructure/databases/postgressql/repositories/service.repository'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'
import { StripeModule } from '@infrastructure/services/stripe/stripe.module'

import { NotificationModule } from './notification.module'
import { PromotionsModule } from './promotion.module'
import { ServicesModule } from './service.module'
import { UsersModule } from './user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User, Service, Promotion]),
    EnvironmentConfigModule,
    JwtModule,
    BcryptModule,
    ExceptionsModule,
    StripeModule,
    UsersModule,
    ServicesModule,
    PromotionsModule,
    NotificationModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: AppointmentRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: SERVICE_REPOSITORY,
      useClass: ServiceRepository,
    },
    {
      provide: MAILER_SERVICE,
      useClass: NodeMailerService,
    },
    {
      provide: PROMOTION_REPOSITORY,
      useClass: PromotionRepository,
    },

    GetListAppointmentUseCase,
    GetDetailAppointmentUseCase,
    CreateAppointmentUseCase,
    UpdateAppointmentUseCase,
    DeleteAppointmentUseCase,
    GetListAppointmentByClientUseCase,
    CreateNotificationUseCase,
  ],
})
export class AppointmentsModule {}
