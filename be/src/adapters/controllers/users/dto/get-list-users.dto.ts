import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { ISearchUsersParams } from '@domain/repositories/user.repository.interface'

export class GetListUsersDto implements ISearchUsersParams {
  @ApiProperty({
    required: true,
    enum: UserStatusEnum,
    description: '1: active , 2: inactive, 3: pending, 4: banned',
  })
  status!: UserStatusEnum

  @ApiProperty({
    required: false,
    enum: UserRoleEnum,
    description: '1: Admin, 2: Provider, 3: Client, empty: All',
  })
  @Transform(({ value }: { value: string }) => parseInt(value))
  role?: UserRoleEnum

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  size?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  page?: number

  @ApiProperty({
    required: false,
    description: 'empty: All',
  })
  @IsString()
  @IsOptional()
  search?: string
}
