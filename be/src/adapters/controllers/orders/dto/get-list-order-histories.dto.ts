import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator'

export class GetListOrderHistoriesDto {
  @ApiPropertyOptional({ description: 'Number of items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number = 50

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderId?: number

  @ApiPropertyOptional({ description: 'Order Code' })
  @IsOptional()
  @IsString()
  orderCode?: string

  @ApiPropertyOptional({
    description: 'Action type',
    enum: [
      'CREATED',
      'STATUS_CHANGE',
      'PAYMENT_CHANGE',
      'UPDATED_INFO',
      'SEPAY_PAYMENT',
      'GHN_SYNC',
      'NOTE_ADDED',
      'CANCELLED',
    ],
  })
  @IsOptional()
  @IsString()
  action?: string

  @ApiPropertyOptional({ description: 'Search term across code, title, note, actor' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ description: 'Actor username or name' })
  @IsOptional()
  @IsString()
  actor?: string

  @ApiPropertyOptional({ description: 'Start Date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'End Date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string
}
