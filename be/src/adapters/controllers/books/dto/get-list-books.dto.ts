import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class GetListBooksDto {
  @ApiProperty({ required: false, description: 'Search by title or author' })
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

  @ApiProperty({ required: false, description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({
    required: false,
    description: 'Filter by status',
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
  })
  @IsOptional()
  @IsString()
  status?: string

  @ApiProperty({ required: false, description: 'Minimum selling price' })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  minPrice?: number

  @ApiProperty({ required: false, description: 'Maximum selling price' })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  maxPrice?: number

  @ApiProperty({
    required: false,
    description: 'Created at start date (ISO or YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiProperty({
    required: false,
    description: 'Created at end date (ISO or YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  endDate?: string

  @ApiProperty({
    required: false,
    description: 'Sort field (e.g. createdAt, sellingPrice, title, stock)',
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
