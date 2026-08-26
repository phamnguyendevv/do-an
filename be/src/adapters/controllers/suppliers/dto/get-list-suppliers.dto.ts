import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class GetListSuppliersDto {
  @ApiProperty({ required: false, description: 'Search by supplier name, contact, phone or email' })
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
}
