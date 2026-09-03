import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType!: 'PERCENTAGE' | 'FIXED'

  @IsNumber()
  @Min(0)
  discountValue!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number

  @IsDateString()
  startsAt!: string

  @IsDateString()
  endsAt!: string

  @IsOptional()
  @IsString()
  note?: string
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType?: 'PERCENTAGE' | 'FIXED'

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  endsAt?: string

  @IsOptional()
  isActive?: boolean

  @IsOptional()
  @IsString()
  note?: string
}

export class ListPromotionsDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  size?: number
}

export class ValidatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsNumber()
  @Min(0)
  orderValue!: number
}
