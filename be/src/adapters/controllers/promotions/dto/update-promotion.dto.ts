import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator'

import { DiscountTypeEnum } from '@domain/entities/promotion.entity'

export class UpdatePromotionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(DiscountTypeEnum)
  discountType?: DiscountTypeEnum

  @ApiProperty({ required: false })
  @IsOptional()
  discountValue?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date

  @ApiProperty({ required: false })
  @IsOptional()
  usageLimit?: number
  @ApiProperty({ required: false })
  @IsOptional()
  usedCount?: number

  @ApiProperty({ required: false })
  @IsOptional()
  minAmount?: number

  @ApiProperty({ required: false })
  @IsOptional()
  maxDiscount?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string
}
