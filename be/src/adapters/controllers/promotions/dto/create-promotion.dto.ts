import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreatePromotionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code!: string

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  discountValue!: number

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  maxDiscount!: number

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  usageLimit!: number


  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date
}
