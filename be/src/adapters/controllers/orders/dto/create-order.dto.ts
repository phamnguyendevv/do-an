import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateOrderItemDto {
  @ApiProperty({ example: 1, required: true })
  @IsNotEmpty()
  bookId!: number | string

  @ApiProperty({ example: 'Clean Code', required: true })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ example: 2, required: true })
  @IsNumber()
  @Min(1)
  quantity!: number

  @ApiProperty({ example: 349000, required: true })
  @IsNumber()
  @Min(0)
  price!: number
}

export class CreateBookstoreOrderDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  customerId?: number

  @ApiProperty({ example: 'ORD-2025001', required: false })
  @IsOptional()
  @IsString()
  orderCode?: string

  @ApiProperty({ example: 'Nguyễn Văn A', required: true })
  @IsString()
  @IsNotEmpty()
  customerName!: string

  @ApiProperty({ example: '0901234567', required: true })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string

  @ApiProperty({ example: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', required: true })
  @IsString()
  @IsNotEmpty()
  customerAddress!: string

  @ApiProperty({ example: 202, required: false })
  @IsOptional()
  @IsNumber()
  provinceId?: number

  @ApiProperty({ example: 1442, required: false })
  @IsOptional()
  @IsNumber()
  districtId?: number

  @ApiProperty({ example: '20109', required: false })
  @IsOptional()
  @IsString()
  wardCode?: string

  @ApiProperty({ type: [CreateOrderItemDto], required: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]

  @ApiProperty({ example: 30000, required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number

  @ApiProperty({ example: 0, required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number

  @ApiProperty({ example: 'WELCOME10', required: false })
  @IsOptional()
  @IsString()
  promotionCode?: string

  @ApiProperty({ example: 'Giao Hàng Nhanh (GHN)', required: false })
  @IsOptional()
  @IsString()
  shippingMethod?: string

  @ApiProperty({ example: 'GHN-123456', required: false })
  @IsOptional()
  @IsString()
  trackingCode?: string

  @ApiProperty({ example: 'Giao giờ hành chính', required: false })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({ example: 'DELIVERED', required: false })
  @IsOptional()
  @IsString()
  status?: string

  @ApiProperty({ example: 'PAID', required: false })
  @IsOptional()
  @IsString()
  payment?: string
}
