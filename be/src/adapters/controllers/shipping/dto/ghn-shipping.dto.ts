import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class CalculateFeeDto {
  @ApiProperty({ example: 1444, description: 'ID Quận/Huyện người nhận' })
  @IsNumber()
  @IsNotEmpty()
  toDistrictId!: number

  @ApiProperty({ example: '20311', description: 'Mã Phường/Xã người nhận' })
  @IsString()
  @IsNotEmpty()
  toWardCode!: string

  @ApiProperty({
    example: 600,
    description: 'Tổng trọng lượng kiện hàng (gram)',
  })
  @IsNumber()
  @Min(1)
  weight!: number

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  length?: number

  @ApiProperty({ example: 15, required: false })
  @IsOptional()
  @IsNumber()
  width?: number

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  height?: number

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Giá trị bảo hiểm (VND)',
  })
  @IsOptional()
  @IsNumber()
  insuranceValue?: number

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Gói dịch vụ (2: Chuẩn)',
  })
  @IsOptional()
  @IsNumber()
  serviceTypeId?: number
}

export class LeadTimeDto {
  @ApiProperty({ example: 1444 })
  @IsNumber()
  @IsNotEmpty()
  toDistrictId!: number

  @ApiProperty({ example: '20311' })
  @IsString()
  @IsNotEmpty()
  toWardCode!: string
}

export class GhnItemDto {
  @ApiProperty({ example: 'Đắc Nhân Tâm' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ example: 'BOOK-1', required: false })
  @IsOptional()
  @IsString()
  code?: string

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number

  @ApiProperty({ example: 86000 })
  @IsNumber()
  @Min(0)
  price!: number

  @ApiProperty({ example: 300, required: false })
  @IsOptional()
  @IsNumber()
  weight?: number
}

export class CreateGhnOrderDto {
  @ApiProperty({ example: 'ORD-1001' })
  @IsString()
  @IsNotEmpty()
  clientOrderCode!: string

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  toName!: string

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  toPhone!: string

  @ApiProperty({ example: 'Số 123 Đường Cầu Giấy' })
  @IsString()
  @IsNotEmpty()
  toAddress!: string

  @ApiProperty({ example: '20311' })
  @IsString()
  @IsNotEmpty()
  toWardCode!: string

  @ApiProperty({ example: 1444 })
  @IsNumber()
  @IsNotEmpty()
  toDistrictId!: number

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Tiền thu hộ COD',
  })
  @IsOptional()
  @IsNumber()
  codAmount?: number

  @ApiProperty({ example: 'Giao giờ hành chính', required: false })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({
    example: 'CHOXEMHANGKHONGTHU',
    enum: ['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'])
  requiredNote?: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG'

  @ApiProperty({
    example: 2,
    description: '1: Shop trả phí ship, 2: Khách trả phí ship',
  })
  @IsOptional()
  @IsNumber()
  paymentTypeId?: number

  @ApiProperty({ example: 600 })
  @IsNumber()
  @Min(1)
  weight!: number

  @ApiProperty({ type: [GhnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhnItemDto)
  items!: GhnItemDto[]
}

export class PrintTokenDto {
  @ApiProperty({ example: ['L7K9G1'] })
  @IsArray()
  @IsString({ each: true })
  orderCodes!: string[]
}

export class UpdateGhnOrderDto {
  @ApiProperty({
    example: '5F5NH3LN',
    description: 'Mã vận đơn GHN (bắt buộc)',
  })
  @IsString()
  @IsNotEmpty()
  order_code!: string

  @ApiProperty({ example: 'Nguyễn Văn B', required: false })
  @IsOptional()
  @IsString()
  to_name?: string

  @ApiProperty({ example: '0987654321', required: false })
  @IsOptional()
  @IsString()
  to_phone?: string

  @ApiProperty({ example: 'Số 123 Đường Cầu Giấy', required: false })
  @IsOptional()
  @IsString()
  to_address?: string

  @ApiProperty({ example: '20311', required: false })
  @IsOptional()
  @IsString()
  to_ward_code?: string

  @ApiProperty({ example: 1444, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  to_district_id?: number

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Tiền thu hộ COD (max 10.000.000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cod_amount?: number

  @ApiProperty({ example: 'Đơn hàng sách', required: false })
  @IsOptional()
  @IsString()
  content?: string

  @ApiProperty({
    example: 600,
    required: false,
    description: 'Trọng lượng (gram, max 50.000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  length?: number

  @ApiProperty({ example: 15, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Giá trị bảo hiểm (max 5.000.000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  insurance_value?: number

  @ApiProperty({
    example: 2,
    required: false,
    description: '1: Shop trả, 2: Khách trả',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payment_type_id?: number

  @ApiProperty({ example: 'Nhớ gọi 30p khi giao', required: false })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({
    example: 'CHOXEMHANGKHONGTHU',
    enum: ['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'])
  required_note?: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG'

  @ApiProperty({ type: [GhnItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhnItemDto)
  items?: GhnItemDto[]
}
