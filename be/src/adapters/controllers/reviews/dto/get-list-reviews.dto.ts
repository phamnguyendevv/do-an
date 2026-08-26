import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator'

import { ISearchReviewParams } from '@domain/repositories/review.repository.interface'

export class GetListReviewsDto implements ISearchReviewParams {
  @ApiProperty({
    required: false,
    description: 'Filter reviews by comment',
  })
  @IsOptional()
  search?: string

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'Pagination size, empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  size?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'Pagination page, empty: 1',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  page?: number

  @ApiProperty({
    required: false,
    description: 'Filter by client ID',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  clientId?: number

  @ApiProperty({
    required: false,
    description: 'Filter by provider ID',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  providerId?: number

  @ApiProperty({
    required: false,
    description: 'Filter by service ID',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  serviceId?: number

  @ApiProperty({
    required: false,
    description: 'Filter by rating',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  rating?: number
}
