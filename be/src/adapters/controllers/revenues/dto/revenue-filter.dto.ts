import { ApiProperty } from '@nestjs/swagger'

import { IsOptional } from 'class-validator'

import { PaymentStatusEnum } from '@domain/entities/payment.entity'

export class RevenueFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  startDate?: Date
  @ApiProperty({ required: false })
  @IsOptional()
  endDate?: Date

  @ApiProperty({ required: false })
  @IsOptional()
  serviceId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  paymentStatus?: PaymentStatusEnum

  @ApiProperty({ required: false })
  @IsOptional()
  page?: number
  @ApiProperty({ required: false })
  @IsOptional()
  size?: number
}
