import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({
    required: true,
    format: 'email',
    default: 'tuanduvip1@gmail.com',
  })
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    required: true,
    format: 'password',
    default: 'Tuandu123@',
  })
  @IsNotEmpty()
  @IsString()
  password!: string
}
