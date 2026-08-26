import { Inject, Injectable } from '@nestjs/common'

import { AppointmentEntity } from '@domain/entities/appointment.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
  ISearchAppointmentsParams,
} from '@domain/repositories/appointment.repository.interface'

@Injectable()
export class GetListAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
  ) {}

  async execute(queryParams: ISearchAppointmentsParams): Promise<{
    data: AppointmentEntity[]
    pagination: IPaginationParams
  }> {
    return await this.appointmentRepository.findAppointments(queryParams)
  }
}
