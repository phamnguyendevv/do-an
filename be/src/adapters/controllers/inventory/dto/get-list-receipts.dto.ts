import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class GetListReceiptsDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã phiếu, NCC, lý do, ghi chú)' })
  @IsOptional()
  @IsString()
  search?: string

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

  @ApiPropertyOptional({ description: 'ID nhà cung cấp (chỉ áp dụng cho phiếu nhập)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number

  @ApiPropertyOptional({ description: 'Lý do xuất (chỉ áp dụng cho phiếu xuất)' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string
}
