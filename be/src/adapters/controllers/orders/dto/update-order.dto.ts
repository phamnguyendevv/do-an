import { ApiProperty } from '@nestjs/swagger'

import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateBookstoreOrderDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  customerName?: string

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string

  @ApiProperty({
    example: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerAddress?: string

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

  @ApiProperty({ example: 30000, required: false })
  @IsOptional()
  @IsNumber()
  shippingFee?: number

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  discount?: number

  @ApiProperty({ example: 'Giao giờ hành chính', required: false })
  @IsOptional()
  @IsString()
  note?: string
}
