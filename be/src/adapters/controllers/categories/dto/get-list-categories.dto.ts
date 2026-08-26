import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, Min } from 'class-validator'

import { ISearchCategoryParams } from '@domain/repositories/category.repository.interface'

export class GetListCategoriesDto implements ISearchCategoryParams {
  @ApiProperty({
    required: false,
    description: 'Filter categories by name',
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
}
