import { ApiProperty } from '@nestjs/swagger'

import { IsNumber, IsOptional, IsString } from 'class-validator'

export class SePayWebhookDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  id?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gateway?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subAccount?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transferType?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  transferAmount?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  accumulated?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceCode?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string
}
