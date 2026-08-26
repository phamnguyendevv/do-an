import { ApiProperty } from '@nestjs/swagger'

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class CreateReviewDto {

  @ApiProperty({
    description: 'ID of the client',
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  clientId!: number

  @ApiProperty({
    description: 'ID of the provider',
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  providerId!: number

  @ApiProperty({
    description: 'ID of the service',
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  serviceId!: number

  @ApiProperty({
    description: 'Rating from 1 to 5',
    required: true,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating!: number

  @ApiProperty({
    required: false,
    description: 'Review comment',
  })
  @IsOptional()
  @IsString()
  comment?: string
}
