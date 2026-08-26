import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class RegisterProviderDto {
  @ApiProperty({
    required: true,
    maxLength: 255,
    description: 'email address',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  email!: string

  @ApiProperty({
    required: true,
    maxLength: 255,
    description: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  password!: string

  @ApiProperty({
    required: true,
    maxLength: 255,
    description: 'confirm password ',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  confirmPassword!: string

  @ApiProperty({
    required: true,
    maxLength: 255,
    description: 'business name',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  businessName!: string

  @ApiProperty({
    required: false,
    maxLength: 20000,
    description: 'business  description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  businessDescription?: string

  @ApiProperty({
    required: false,
    description: 'bank account information',
  })
  @IsOptional()
  bankAccountInfo?: object

  @ApiProperty({
    required: false,
    description: 'phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string
}
