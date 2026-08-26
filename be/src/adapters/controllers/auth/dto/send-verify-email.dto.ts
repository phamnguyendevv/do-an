import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty } from 'class-validator'

export class SendVerifyEmailDto {
  @ApiProperty({ required: true, format: 'email' })
  @IsNotEmpty()
  email!: string
}
