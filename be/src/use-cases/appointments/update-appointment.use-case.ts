import { Inject, Injectable } from '@nestjs/common'

import {
  AppointmentEntity,
  AppointmentStatusEnum,
} from '@domain/entities/appointment.entity'
import { NotificationTypeEnum } from '@domain/entities/notification.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'

import { CreateNotificationUseCase } from '@use-cases/notification/create-notification.use-case'

@Injectable()
export class UpdateAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,

    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(
    id: number,
    appointment: Partial<AppointmentEntity>,
    userId: number,
  ): Promise<boolean> {
    const existingAppointment = await this.checkAppointmentExists(id, userId)

    // Update appointment before sending notification (except if intentionally skipped)
    await this.appointmentRepository.updateAppointment(id, appointment)

    switch (appointment.status) {
      case AppointmentStatusEnum.Confirmed:
        await this.createNotificationUseCase.execute({
          senderId: userId,
          receiverId: existingAppointment.providerId,
          title: 'Appointment Confirmed',
          message: appointment.notes || 'No additional notes',
          type: NotificationTypeEnum.AppointmentConfirmed,
          data: { appointmentId: id },
        })
        break

      case AppointmentStatusEnum.Completed:
        await this.createNotificationUseCase.execute({
          senderId: userId,
          receiverId: existingAppointment.providerId,
          title: 'Appointment Completed',
          message: appointment.notes || 'No additional notes',
          type: NotificationTypeEnum.AppointmentCompleted,
          data: { appointmentId: id },
        })
        break

      case AppointmentStatusEnum.Cancelled:
        await this.createNotificationUseCase.execute({
          senderId: userId,
          receiverId: existingAppointment.providerId,
          title: 'Appointment Cancelled',
          message: appointment.notes || 'No additional notes',
          type: NotificationTypeEnum.AppointmentCancelled,
          data: { appointmentId: id },
        })
        break
    }

    return true
  }

  private async checkAppointmentExists(
    id: number,
    userId: number,
  ): Promise<AppointmentEntity> {
    const appointment = await this.appointmentRepository.findAppointment({
      id,
      providerId: userId,
    })

    if (!appointment || appointment.length === 0) {
      throw this.exceptionsService.notFoundException({
        type: 'AppointmentNotFoundException',
        message: 'Appointment not found',
      })
    }

    const appt = appointment[0]
    if (
      appt.status === AppointmentStatusEnum.Completed ||
      appt.status === AppointmentStatusEnum.Cancelled
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'AppointmentUpdateException',
        message: 'Cannot update completed or cancelled appointment',
      })
    }

    return appt
  }
}
