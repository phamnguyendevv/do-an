import { Inject, Injectable } from '@nestjs/common'

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'
import { PromotionEntity } from '@domain/entities/promotion.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'
import {
  IPromotionRepositoryInterface,
  ISearchPromotionParams,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetListPromotionsByClientUseCase {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,

    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(
    props: ISearchPromotionParams,
    userId: number,
  ): Promise<{ data: PromotionEntity[]; pagination: IPaginationParams }> {
    await this.checkUserExits(userId)
    await this.checkAppointmentsCompleted(userId)

    return this.promotionRepository.getListPromotion(props)
  }
  private async checkUserExits(userId: number): Promise<void> {
    const user = await this.userRepository.getUserById(userId)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
  }
  private async checkAppointmentsCompleted(userId: number): Promise<void> {
    const appointments = await this.appointmentRepository.findAppointments({
      clientId: userId,
      status: AppointmentStatusEnum.Completed,
    })
    if (appointments.data.length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'NoCompletedAppointmentsException',
        message: 'You have no completed appointments to use promotions',
      })
    }
  }
}
