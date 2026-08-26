import {
  AppointmentEntity,
  AppointmentStatusEnum,
} from '@domain/entities/appointment.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

import { GetListAppointmentPresenter } from '@adapters/controllers/appointments/presenters/get-list-appointment.presenters'

export interface ISearchAppointmentsParams {
  id?: number
  search?: string
  page?: number
  size?: number
  clientId?: number
  providerId?: number
  serviceId?: number
  startTime?: Date
  endTime?: Date
  duration?: number
  cancellationReason?: string
  cancelledByUserId?: number
  cancelledAt?: Date
  totalAmount?: number
  commissionAmount?: number
  providerAmount?: number
  reminderSentAt?: Date
  reminderSent?: boolean
  status?: AppointmentStatusEnum
  createdAt?: Date
}

export const APPOINTMENT_REPOSITORY = 'APPOINTMENT_REPOSITORY_INTERFACE'
export interface IAppointmentRepositoryInterface {
  getAppointmentById(id: number): Promise<GetListAppointmentPresenter | null>
  createAppointment(
    appointment: Partial<AppointmentEntity>,
  ): Promise<AppointmentEntity>
  updateAppointment(
    id: number,
    appointment: Partial<AppointmentEntity>,
  ): Promise<boolean>
  deleteAppointment(id: number): Promise<boolean>
  findAppointment(
    queryParams: ISearchAppointmentsParams,
  ): Promise<AppointmentEntity[]>

  findAppointments(
    queryParams: ISearchAppointmentsParams,
  ): Promise<{ data: AppointmentEntity[]; pagination: IPaginationParams }>
}
