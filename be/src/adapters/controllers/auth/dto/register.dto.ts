import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

import { Match } from '@adapters/controllers/common/decorators/match.decorator'

export class RegisterDto {
  @ApiProperty({ required: true, format: 'email' })
  @IsNotEmpty()
  email!: string

  @ApiProperty({ required: true, format: 'username' })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  username!: string

  @ApiProperty({
    required: true,
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  password!: string

  @ApiProperty({
    required: true,
    format: 'confirmPassword',
  })
  @Match('password', { message: 'Passwords do not match' })
  @IsNotEmpty()
  @IsString()
  confirmPassword?: string

  @ApiProperty({
    required: true,
    format: 'role',
    default: UserRoleEnum.Client,
  })
  @IsNumber()
  @IsOptional()
  role!: UserRoleEnum

  @ApiProperty({
    format: 'status',
    default: UserStatusEnum.InActive,
  })
  @IsOptional()
  status?: UserStatusEnum

  @ApiProperty({
    required: false,
    format: 'emailVerified',
    default: false,
  })
  @IsOptional()
  emailVerified?: boolean

  @ApiProperty({
    required: false,
    format: 'phone',
    default: false,
  })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({
    required: false,
    format: 'avatarUrl',
    default: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string

  @ApiProperty({
    required: false,
    format: 'avatarPublicId',
    default: false,
  })
  @IsOptional()
  @IsString()
  avatarPublicId?: string

  @ApiProperty({
    required: false,
    format: 'addressProvince',
    default: false,
  })
  @IsOptional()
  @IsString()
  addressProvince?: string

  @ApiProperty({
    required: false,
    format: 'addressDistrict',
    default: false,
  })
  @IsOptional()
  @IsString()
  addressDistrict?: string

  @ApiProperty({
    required: false,
    format: 'addressWard',
    default: false,
  })
  @IsOptional()
  @IsString()
  addressWard?: string

  @ApiProperty({
    required: false,
    format: 'addressDetail',
    default: false,
  })
  @IsOptional()
  @IsString()
  addressDetail?: string

  @ApiProperty({
    required: false,
    format: 'isProvider',
    default: false,
  })
  @IsOptional()
  isProvider?: boolean
}
