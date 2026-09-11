import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CreateBookDto {
  @ApiProperty({ example: 'Clean Code', required: true })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ example: 'Robert C. Martin', required: true })
  @IsString()
  @IsNotEmpty()
  author!: string

  @ApiProperty({
    example: 'Công nghệ',
    required: true,
    description: 'Tên thể loại',
  })
  @IsString()
  @IsNotEmpty()
  category!: string

  @ApiProperty({
    example: 1,
    required: false,
    description:
      'ID thể loại (FK tới bảng categories — khi có, sẽ populate category_id)',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  categoryId?: number

  @ApiProperty({ example: 210000, required: true })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  purchasePrice!: number

  @ApiProperty({ example: 349000, required: true })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  sellingPrice!: number

  @ApiProperty({ example: 64, required: true })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  stock!: number

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  minStock?: number
}
