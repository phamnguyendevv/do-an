import { ApiProperty } from '@nestjs/swagger'

import { IsOptional, IsString } from 'class-validator'

export class CheckExistDto {
  @ApiProperty({ required: false, description: 'Email to check' })
  @IsOptional()
  @IsString()
  email?: string

  @ApiProperty({ required: false, description: 'Username to check' })
  @IsOptional()
  @IsString()
  username?: string

  @ApiProperty({ required: false, description: 'Phone to check' })
  @IsOptional()
  @IsString()
  phone?: string
}
