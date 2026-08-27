import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

import { StockMovementType } from '@domain/entities/stock-movement.entity'

export class GetStockMovementsDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên sách, mã tham chiếu, ghi chú)' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ description: 'ID sách' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bookId?: number

  @ApiPropertyOptional({
    description: 'Loại biến động',
    enum: ['IMPORT', 'EXPORT', 'SALE', 'RESTOCK', 'ADJUST'],
  })
  @IsOptional()
  @IsIn(['IMPORT', 'EXPORT', 'SALE', 'RESTOCK', 'ADJUST'])
  type?: StockMovementType

  @ApiPropertyOptional({ description: 'Số bản ghi / trang', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string
}
