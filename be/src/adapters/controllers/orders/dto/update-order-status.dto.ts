import { ApiProperty } from '@nestjs/swagger'

import { IsEnum } from 'class-validator'

import { OrderStatusEnum } from '@domain/entities/order-enums.entity'

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: 'CONFIRMED',
    enum: OrderStatusEnum,
    required: true,
  })
  @IsEnum(OrderStatusEnum)
  status!: OrderStatusEnum
}
