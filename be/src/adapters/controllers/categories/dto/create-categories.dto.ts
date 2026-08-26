import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the category',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    required: false,
    maxLength: 20000,
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string
}
