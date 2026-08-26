import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty({ required: true, format: 'email' })
  @IsNotEmpty()
  email!: string

  @ApiProperty({ required: true, format: 'inputOtp' })
  @IsNotEmpty()
  @IsString()
  inputOtp!: string

  @ApiProperty({
    required: true,
    format: 'newPassword',
  })
  @IsNotEmpty()
  @IsString()
  newPassword!: string
}
