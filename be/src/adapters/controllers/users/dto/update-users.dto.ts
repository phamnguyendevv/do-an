// update-user.dto.ts
import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

import { RegisterDto } from '@adapters/controllers/auth/dto/register.dto'

export class UpdateUserDto extends PartialType(
  OmitType(RegisterDto, [
    'password',
    'role',
    'status',
    'emailVerified',
    'confirmPassword',
    'isProvider',
  ] as const),
) {}

export class AdminUpdateUserDto extends PartialType(RegisterDto) {
  @ApiProperty({ default: false })
  @IsOptional()
  emailVerified?: boolean
}

export class AdminResetPasswordDto {
  @ApiProperty({
    description: 'New password for user set by admin',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  password!: string
}
