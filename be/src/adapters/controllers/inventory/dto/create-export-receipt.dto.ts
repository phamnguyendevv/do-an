import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class ExportReceiptLineDto {
  @ApiProperty({ description: 'ID sách' })
  @IsNotEmpty()
  bookId!: number | string

  @ApiProperty({ description: 'Số lượng xuất' })
  @IsNumber()
  @Min(1)
  quantity!: number

  @ApiPropertyOptional({ description: 'Giá xuất (nếu có)' })
  @IsOptional()
  @IsNumber()
  price?: number
}

export class CreateExportReceiptDto {
  @ApiPropertyOptional({
    description: 'ID đơn hàng liên kết (nếu xuất theo đơn)',
  })
  @IsOptional()
  @IsNumber()
  orderId?: number

  @ApiProperty({
    description: 'Lý do xuất kho (Xuất bán, Xuất hủy/hỏng, Xuất mẫu,...)',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({
    type: [ExportReceiptLineDto],
    description: 'Danh sách sản phẩm xuất',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportReceiptLineDto)
  lines!: ExportReceiptLineDto[]
}
