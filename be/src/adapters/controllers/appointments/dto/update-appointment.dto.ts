import { ApiProperty } from '@nestjs/swagger'

import { IsOptional } from 'class-validator'

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'

export class UpdateAppointmentDto {
  @ApiProperty({
    required: false,
    enum: AppointmentStatusEnum,
    description: 'Status of the appointment',
  })
  @IsOptional()
  status?: AppointmentStatusEnum
}
