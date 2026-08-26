// update-user.dto.ts
import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

import { IsOptional, IsString } from 'class-validator'

import { RegisterDto } from '@adapters/controllers/auth/dto/register.dto'

export class UpdateUserDto extends PartialType(
  OmitType(RegisterDto, [
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
