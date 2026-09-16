import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class GetListBookstoreOrdersDto {
  @ApiProperty({ required: false, example: 'ORD-2025001' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({ required: false, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  page?: number

  @ApiProperty({ required: false, minimum: 1, description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  size?: number

  @ApiProperty({ required: false, example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiProperty({ required: false, example: 'PAID' })
  @IsOptional()
  @IsString()
  payment?: string

  @ApiProperty({ required: false, example: '2026-08-01' })
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiProperty({ required: false, example: '2026-08-31' })
  @IsOptional()
  @IsString()
  endDate?: string

  @ApiProperty({ required: false, description: 'Minimum order total (VND)' })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  minTotal?: number

  @ApiProperty({ required: false, description: 'Maximum order total (VND)' })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  maxTotal?: number

  @ApiProperty({
    required: false,
    description: 'Sort field (createdAt, total)',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string

  @ApiProperty({
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort direction',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC'
}
