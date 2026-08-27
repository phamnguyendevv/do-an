import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateOrderPaymentDto {
  @ApiProperty({
    example: 'PAID',
    enum: ['PAID', 'UNPAID', 'REFUNDED'],
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  payment!: string
}
