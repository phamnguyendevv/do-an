import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class UpdateBookDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string

  @ApiProperty({ required: false, description: 'Tên thể loại (string)' })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({
    required: false,
    description: 'ID thể loại (FK tới bảng categories)',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  categoryId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  purchasePrice?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  sellingPrice?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  stock?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minStock?: number
}
