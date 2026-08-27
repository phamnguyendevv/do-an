import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class StockAuditItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  bookId!: number

  @ApiProperty({ example: 'Đắc Nhân Tâm' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsNotEmpty()
  systemStock!: number

  @ApiProperty({ example: 48 })
  @IsNumber()
  @IsNotEmpty()
  actualStock!: number

  @ApiPropertyOptional({ example: 'Hỏng 2 cuốn do ẩm ướt' })
  @IsString()
  @IsOptional()
  reason?: string
}

export class CreateStockAuditControllerDto {
  @ApiPropertyOptional({ example: 'Kiểm kê kho sách định kỳ tháng 8/2026' })
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional({ example: '2026-08-27' })
  @IsString()
  @IsOptional()
  auditDate?: string

  @ApiPropertyOptional({ example: 'Kiểm kê toàn bộ kệ sách tiểu thuyết' })
  @IsString()
  @IsOptional()
  note?: string

  @ApiProperty({ type: [StockAuditItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockAuditItemDto)
  items!: StockAuditItemDto[]
}

export class GetListAuditsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  size?: number

  @ApiPropertyOptional({ example: 'DRAFT', enum: ['all', 'DRAFT', 'BALANCED'] })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ example: 'tháng 8' })
  @IsOptional()
  @IsString()
  search?: string
}
