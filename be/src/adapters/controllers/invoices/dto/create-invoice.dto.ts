import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator'

import { InvoiceStatusEnum } from '@domain/entities/invoice.entity'

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Appointment ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  appointmentId!: number

  @ApiProperty({
    description: 'Order ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  orderId!: number

  @ApiProperty({
    description: 'Provider ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  providerId!: number

  @ApiProperty({
    description: 'Client ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  clientId!: number

  @ApiProperty({
    description: 'Issue date',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  issueDate?: Date

  @ApiProperty({
    description: 'Due date',
    example: '2024-02-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date

  @ApiProperty({
    description: 'Subtotal amount',
    example: 100.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  subtotal!: number

  @ApiProperty({
    description: 'Discount amount',
    example: 10.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount?: number

  @ApiProperty({
    description: 'Tax amount',
    example: 8.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number

  @ApiProperty({
    description: 'Total amount',
    example: 98.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  totalAmount!: number

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatusEnum,
    example: InvoiceStatusEnum.Draft,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceStatusEnum)
  status?: InvoiceStatusEnum

  @ApiProperty({
    description: 'Invoice notes',
    example: 'Thank you for your business',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({
    description: 'Payment terms',
    example: 'Net 30',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string
}
