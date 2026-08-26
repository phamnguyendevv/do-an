import { Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class OrderItemDto {
  @IsString()
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  quantity!: number

  @IsNumber()
  unitAmount!: number
}

class AddressDto {
  @IsOptional()
  @IsString()
  line1?: string

  @IsOptional()
  @IsString()
  line2?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  postal_code?: string

  @IsOptional()
  @IsString()
  country?: string
}
export class CustomerInfoDto {
  @IsString()
  @IsOptional()
  email!: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto
}

export class CreateInvoiceFromOrderDto {
  @IsNumber()
  paymentId!: number

  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo!: CustomerInfoDto

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[]

  @IsOptional()
  @IsNumber()
  dueDays?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  metadata?: Record<string, string>
}
