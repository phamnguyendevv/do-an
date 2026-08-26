import { ApiProperty } from '@nestjs/swagger'

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'

export class CreateAppointmentPresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  providerId!: number

  @ApiProperty()
  clientId!: number

  @ApiProperty()
  serviceId!: number

  @ApiProperty()
  notes!: string

  @ApiProperty()
  startTime!: Date

  @ApiProperty()
  endTime!: Date

  @ApiProperty()
  duration!: number

  @ApiProperty()
  cancellationReason?: string

  @ApiProperty()
  cancelledByUserId?: number
  @ApiProperty()
  cancelledAt?: Date

  @ApiProperty()
  totalAmount!: number

  @ApiProperty({
    required: true,
    enum: UserRoleEnum,
    description: '1: Pending , 2: Confirmed, 3: Completed, 4: Cancelled',
  })
  status!: AppointmentStatusEnum

  constructor(partial: CreateAppointmentPresenter) {
    this.id = partial.id
    this.providerId = partial.providerId
    this.clientId = partial.clientId
    this.serviceId = partial.serviceId
    this.notes = partial.notes
    this.startTime = partial.startTime
    this.endTime = partial.endTime
    this.duration = partial.duration
    this.cancellationReason = partial.cancellationReason
    this.cancelledByUserId = partial.cancelledByUserId
    this.cancelledAt = partial.cancelledAt
    this.totalAmount = partial.totalAmount
    this.status = partial.status
  }
}
