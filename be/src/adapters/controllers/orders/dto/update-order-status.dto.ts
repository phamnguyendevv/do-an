import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: 'CONFIRMED',
    enum: [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'SHIPPING',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ],
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  status!: string
}
