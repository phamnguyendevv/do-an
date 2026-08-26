import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, Min } from 'class-validator'

export class GetListServicesDto {
  @ApiProperty({
    required: false,
    description: 'Filter services by name',
  })
  @IsOptional()
  search?: string

  @ApiProperty({
    required: false,
    description: 'Filter services by price',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  minPrice?: number

  @ApiProperty({
    required: false,
    description: 'Filter services by price',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  maxPrice?: number

  @ApiProperty({
    required: false,
    description: 'Filter services by duration',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  duration?: number

  @ApiProperty({
    required: false,
    description: 'Filter services by category ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  categoryId?: number

  @ApiProperty({
    required: false,
    description: 'Filter services by provider ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  providerId?: number

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
    description: 'Pagination size, empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  page?: number
}
