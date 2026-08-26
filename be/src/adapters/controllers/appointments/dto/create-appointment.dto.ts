import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Provider ID associated with the appointment',
    required: true,
  })
  @IsNotEmpty()
  providerId!: number

  @ApiProperty({
    description: 'Service ID associated with the appointment',
    required: true,
  })
  @IsNotEmpty()
  serviceId!: number

  @ApiProperty({
    required: false,
    description: 'Notes for the appointment',
  })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({
    description: 'startTime of the appointment',
    required: true,
  })
  @IsNotEmpty()
  startTime!: Date

  @ApiProperty({
    description: 'endTime of the appointment',
    required: true,
  })
  @IsNotEmpty()
  endTime!: Date

  // =========
  // @ApiProperty({
  //   required: false,
  //   description: 'Cancellation reason for the appointment',
  // })
  // @IsOptional()
  // @IsString()
  // cancellationReason?: string

  // @ApiProperty({
  //   required: false,
  //   description: 'ID of the user who cancelled the appointment',
  // })
  // @IsOptional()
  // cancelledByUserId?: number

  // @ApiProperty({
  //   required: false,
  //   description: 'Cancellation date and time',
  // })
  // @IsOptional()
  // cancelledAt?: Date

  @ApiProperty({
    description: 'Total amount for the appointment',
    required: true,
  })
  @IsNotEmpty()
  totalAmount?: number

  @ApiProperty({
    description: 'Duration of the appointment in minutes',
    required: true,
  })
  @IsNotEmpty()
  duration!: number

  // @ApiProperty({
  //   description: 'Commission amount for the appointment',
  //   required: true,
  // })
  // @IsOptional()
  // commissionAmount?: number

  // @ApiProperty({
  //   description: 'Provider amount for the appointment',
  //   required: true,
  // })
  // @IsOptional()
  // providerAmount?: number
  // @ApiProperty({
  //   required: false,
  //   description: 'Date and time when the reminder was sent',
  // })
  // @IsOptional()
  // reminderSentAt?: Date

  // @ApiProperty({
  //   description: 'Indicates if a reminder was sent for the appointment',
  //   required: true,
  // })
  // @IsOptional()
  // reminderSent?: boolean

  @ApiProperty({
    required: false,
    description: 'promotionId',
  })
  @IsOptional()
  promotionId?: number
}
