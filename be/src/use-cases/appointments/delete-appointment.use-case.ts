import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'

@Injectable()
export class DeleteAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number): Promise<void> {
    await this.checkIfAppointmentExists(id)
    await this.appointmentRepository.deleteAppointment(id)
  }
  private async checkIfAppointmentExists(id: number): Promise<void> {
    const appointment = await this.appointmentRepository.getAppointmentById(id)
    if (!appointment) {
      throw this.exceptionsService.notFoundException({
        type: 'AppointmentNotFoundException',
        message: 'Appointment not found',
      })
    }
  }
}
