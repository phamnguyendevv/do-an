import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class ListNotificationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  module?: string

  @IsOptional()
  @IsIn(['info', 'success', 'warning', 'error'])
  tone?: string

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  read?: boolean

  @IsOptional()
  @IsISO8601()
  from?: string

  @IsOptional()
  @IsISO8601()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 25
}

export class CreateNotificationDto {
  @IsString()
  @MaxLength(64)
  id!: string

  @IsString()
  @MaxLength(160)
  title!: string

  @IsString()
  @MaxLength(4000)
  description!: string

  @IsString()
  @MaxLength(80)
  module!: string

  @IsIn(['info', 'success', 'warning', 'error'])
  tone!: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  route?: string
}
