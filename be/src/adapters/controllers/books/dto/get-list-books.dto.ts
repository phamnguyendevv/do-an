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

  @ApiProperty({ required: false, description: 'Filter by status', enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  @IsOptional()
  @IsString()
  status?: string
}
