import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface'
import { PROMOTION_REPOSITORY } from '@domain/repositories/promotion.repository.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'

import { CreatePromotionUseCase } from '@use-cases/promotions/create-promotion.use-case'
import { DeletePromotionUseCase } from '@use-cases/promotions/delete-promotion.use-case'
import { GetPromotionUseCase } from '@use-cases/promotions/get-detail-promotion.use-case'
import { GetListPromotionsByClientUseCase } from '@use-cases/promotions/get-list-promotion-by-client.use-case.'
import { GetListPromotionsUseCase } from '@use-cases/promotions/get-list-promotions.use-case'
import { UpdatePromotionUseCase } from '@use-cases/promotions/update-promotion.use-case'

import { PromotionsController } from '@adapters/controllers/promotions/promotions.controller'

import { Appointment } from '@infrastructure/databases/postgressql/entities/appointment.entity'
import { Promotion } from '@infrastructure/databases/postgressql/entities/promotion.entity'
import { User } from '@infrastructure/databases/postgressql/entities/user.entity'
import { AppointmentRepository } from '@infrastructure/databases/postgressql/repositories/appointment.repository'
import { PromotionRepository } from '@infrastructure/databases/postgressql/repositories/promotion.repository'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, User, Appointment]),
    CaslModule,
  ],
  controllers: [PromotionsController],
  providers: [
    {
      provide: PROMOTION_REPOSITORY,
      useClass: PromotionRepository,
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
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    CreatePromotionUseCase,
    DeletePromotionUseCase,
    GetListPromotionsUseCase,
    GetPromotionUseCase,
    UpdatePromotionUseCase,
    GetListPromotionsByClientUseCase,
  ],
})
export class PromotionsModule {}
