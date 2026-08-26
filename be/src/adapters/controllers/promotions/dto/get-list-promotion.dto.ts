import { ApiProperty } from '@nestjs/swagger'

import { IsOptional, IsString } from 'class-validator'

export class GetListPromotionDto {
  @ApiProperty({
    required: false,
    description: 'code promotion',
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsOptional()
  size?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'Pagination size, empty: All',
  })
  @IsOptional()
  page?: number
}
