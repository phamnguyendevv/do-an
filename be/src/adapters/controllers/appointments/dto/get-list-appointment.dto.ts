import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsArray, IsInt, IsOptional } from 'class-validator'

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'

export class GetListAppointmentDto {
  @ApiProperty({
    required: false,
    description: 'Search term to filter appointments by notes or client name',
  })
  @IsOptional()
  search?: string

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Client ID to filter appointments',
  })
  @IsOptional()
  clientId?: number

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Provider ID to filter appointments',
  })
  @IsOptional()
  providerId?: number

  @ApiProperty({
    required: false,
    description: 'Service ID to filter appointments',
  })
  @IsOptional()
  servicesId?: number

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Minimum price for filtering appointments',
  })
  @IsOptional()
  minPrice?: number

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Maximum price for filtering appointments',
  })
  @IsOptional()
  maxPrice?: number

  @ApiProperty({
    required: false,
    enum: AppointmentStatusEnum,
    description: 'Status of the appointment',
  })
  @IsOptional()
  status?: AppointmentStatusEnum

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @IsOptional()
  size?: number

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Page index for pagination',
  })
  @IsOptional()
  page?: number
}
