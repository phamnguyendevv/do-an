import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional } from 'class-validator'

export class GetListNotificationDto {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  userId?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  size?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'Pagination size, empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  page?: number
}
