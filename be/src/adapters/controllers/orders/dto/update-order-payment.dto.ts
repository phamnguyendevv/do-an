import { ApiProperty } from '@nestjs/swagger'

import { IsEnum } from 'class-validator'

import { PaymentStatusEnum } from '@domain/entities/order-enums.entity'

export class UpdateOrderPaymentDto {
  @ApiProperty({
    example: 'PAID',
    enum: PaymentStatusEnum,
    required: true,
  })
  @IsEnum(PaymentStatusEnum)
  payment!: PaymentStatusEnum
}
