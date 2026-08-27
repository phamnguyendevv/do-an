import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class ImportReceiptLineDto {
  @ApiProperty({ description: 'ID sách' })
  @IsNotEmpty()
  bookId!: number | string

  @ApiProperty({ description: 'Số lượng nhập' })
  @IsNumber()
  @Min(1)
  quantity!: number

  @ApiProperty({ description: 'Giá nhập' })
  @IsNumber()
  @Min(0)
  price!: number
}

export class CreateImportReceiptDto {
  @ApiPropertyOptional({ description: 'ID nhà cung cấp' })
  @IsOptional()
  @IsNumber()
  supplierId?: number

  @ApiProperty({ description: 'Tên nhà cung cấp' })
  @IsString()
  @IsNotEmpty()
  supplierName!: string

  @ApiPropertyOptional({ description: 'Ngày nhập kho (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  importDate?: string

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({ type: [ImportReceiptLineDto], description: 'Danh sách sản phẩm nhập' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportReceiptLineDto)
  lines!: ImportReceiptLineDto[]
}
