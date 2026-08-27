import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Họ tên hoặc tên tài khoản' })
  @IsNotEmpty()
  @IsString()
  username!: string

  @ApiProperty({ description: 'Email đăng nhập' })
  @IsNotEmpty()
  @IsEmail()
  email!: string

  @ApiPropertyOptional({ description: 'Mật khẩu (mặc định: password123)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string

  @ApiPropertyOptional({ description: 'Vai trò (1: Admin, 2: Staff, 3: Client)', default: UserRoleEnum.Staff })
  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRoleEnum

  @ApiPropertyOptional({ description: 'Trạng thái (1: Active, 2: Inactive)', default: UserStatusEnum.Active })
  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string
}
