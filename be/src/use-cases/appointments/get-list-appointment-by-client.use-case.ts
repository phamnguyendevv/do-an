import { Inject, Injectable } from '@nestjs/common'

import { AppointmentEntity } from '@domain/entities/appointment.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
  ISearchAppointmentsParams,
} from '@domain/repositories/appointment.repository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetListAppointmentByClientUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchAppointmentsParams,
    userId: number,
  ): Promise<{
    data: AppointmentEntity[]
    pagination: IPaginationParams
  }> {
    const user = await this.checkUserExists(userId)
    if (user.role === UserRoleEnum.Client) {
      queryParams.clientId = userId
    }
    if (user.role === UserRoleEnum.Provider) {
      queryParams.providerId = userId
    }
    return await this.appointmentRepository.findAppointments(queryParams)
  }
  private async checkUserExists(userId: number) {
    const user = await this.userRepository.getUserById(userId)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    return user
  }
}
