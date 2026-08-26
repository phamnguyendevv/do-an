import { ApiProperty } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator'

export class ProductData {
  @ApiProperty({
    description: 'ID of the product',
    required: true,
  })
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    required: false,
    description: 'Description of the product',
  })
  @IsOptional()
  @IsNotEmpty()
  description?: string
}

export class PriceData {
  @ApiProperty({
    description: 'Currency for the product',
    required: true,
  })
  @IsNotEmpty()
  currency!: string

  @ApiProperty({
    description: 'Product data for the payment',
    required: true,
    type: ProductData,
  })
  @ValidateNested()
  @Type(() => ProductData)
  @IsNotEmpty()
  product_data!: ProductData

  @ApiProperty({
    description: 'Unit amount for the product in cents',
    required: true,
  })
  @IsNotEmpty()
  unit_amount!: number
}

export class LineItems {
  @ApiProperty({
    description: 'Price data of the product',
    required: true,
    type: PriceData,
  })
  @ValidateNested()
  @Type(() => PriceData)
  @IsNotEmpty()
  price_data!: PriceData

  @ApiProperty({
    description: 'Quantity of the product',
    required: true,
  })
  @IsNotEmpty()
  quantity!: number
}

export class MetaData {
  @ApiProperty({
    required: false,
    description: 'Appointment ID associated with the payment',
  })
  @IsOptional()
  @IsNotEmpty()
  appointmentId?: string

  @ApiProperty({
    required: false,
    description: 'User ID associated with the payment',
  })
  @IsOptional()
  @IsNotEmpty()
  userId?: string
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Line items for the checkout',
    required: true,
    type: [LineItems],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItems)
  lineItems!: LineItems[]

  @ApiProperty({
    description: 'URL to redirect after successful payment',
    required: true,
  })
  @IsOptional()
  successUrl!: string

  @ApiProperty({
    description: 'URL to redirect after canceled payment',
    required: true,
  })
  @IsOptional()
  cancelUrl!: string

  @ApiProperty({
    description: 'Metadata for the payment',
    required: false,
    type: MetaData,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetaData)
  metadata?: MetaData
}

export class CreateCheckoutSessionDto2 {
  @ApiProperty({
    description: 'ID of the appointment',
    required: true,
    default: 56,
  })
  @IsNotEmpty()
  appointmentId!: number

  @ApiProperty({
    description: 'URL to redirect after successful payment',
    required: true,
    default: 'http://localhost:3000/success',
  })
  @IsNotEmpty()
  successUrl!: string

  @ApiProperty({
    description: 'URL to redirect after canceled payment',
    required: true,
    default: 'http://localhost:3000/cancel',
  })
  @IsNotEmpty()
  cancelUrl!: string
}
