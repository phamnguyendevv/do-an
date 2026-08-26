import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

import { InvoiceStatusEnum } from '@domain/entities/invoice.entity'

export class GetInvoicesListDto {
  @ApiProperty({
    description: 'Search term',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number

  @ApiProperty({
    description: 'Page size',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  size?: number

  @ApiProperty({
    description: 'Invoice number',
    required: false,
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string

  @ApiProperty({
    description: 'Appointment ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  appointmentId?: number

  @ApiProperty({
    description: 'Order ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orderId?: number

  @ApiProperty({
    description: 'Provider ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  providerId?: number

  @ApiProperty({
    description: 'Client ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceStatusEnum)
  status?: InvoiceStatusEnum

  @ApiProperty({
    description: 'Currency code',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string

  @ApiProperty({
    description: 'Minimum amount',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number

  @ApiProperty({
    description: 'Maximum amount',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number

  @ApiProperty({
    description: 'Start date for filtering',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date

  @ApiProperty({
    description: 'End date for filtering',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date

  @ApiProperty({
    description: 'Issue date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  issueDate?: Date

  @ApiProperty({
    description: 'Due date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date
}
