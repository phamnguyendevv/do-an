import { Inject, Injectable } from '@nestjs/common'

import { AppointmentEntity } from '@domain/entities/appointment.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserEntity } from '@domain/entities/user.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetDetailAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(id: number, userId: number): Promise<AppointmentEntity> {
    const user = await this.checkUserExists(userId)
    const appointment = await this.appointmentRepository.findAppointments({
      id: id,
    })
    if (appointment.data.length < 0) {
      throw this.exceptionsService.notFoundException({
        type: 'AppointmentNotFoundException',
        message: 'Appointment not found',
      })
    }
    this.validateAppointmentAccess(user, appointment.data[0])
    return appointment.data[0]
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

  private validateAppointmentAccess(
    user: UserEntity,
    appointment: AppointmentEntity,
  ) {
    if (user.role === UserRoleEnum.Admin) {
      return
    }
    if (user.role === UserRoleEnum.Provider) {
      if (
        appointment.providerId !== user.id &&
        appointment.clientId !== user.id
      ) {
        throw this.exceptionsService.forbiddenException({
          type: 'ForbiddenException',
          message: 'You are not authorized to access this appointment',
        })
      }
      return
    }
    if (user.role === UserRoleEnum.Client) {
      if (appointment.clientId !== user.id) {
        throw this.exceptionsService.forbiddenException({
          type: 'ForbiddenException',
          message: 'You are not authorized to access this appointment',
        })
      }
      return
    }
  }
}
