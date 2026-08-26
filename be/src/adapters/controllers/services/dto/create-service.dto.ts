import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateServiceDto {
  @ApiProperty({
    description: 'Name of the service',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    required: false,
    maxLength: 20000,
    description: 'Service description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string

  @ApiProperty({
    description: 'price of the service',
    required: true,
  })
  @IsNotEmpty()
  price!: number

  @ApiProperty({
    description: 'duration of the service',
    required: true,
  })
  @IsNotEmpty()
  duration!: number

  @ApiProperty({
    description: 'images of the service',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  imageUrl!: string

  @ApiProperty({
    description: 'image public id of the service',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  imagePublicId!: string

  @ApiProperty({
    description: 'Category ID of the service',
    required: true,
  })
  @IsNotEmpty()
  categoryId!: number
}
