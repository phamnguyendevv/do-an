import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateSupplierDto {
  @ApiProperty({ example: 'NXB Kim Đồng', required: true })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  contactName?: string

  @ApiProperty({ example: '0912345678', required: false })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({ example: 'contact@nxbkimdong.vn', required: false })
  @IsOptional()
  @IsString()
  email?: string

  @ApiProperty({ example: '55 Quang Trung, Hà Nội', required: false })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({ example: 'Nhà xuất bản sách thiếu nhi và văn học', required: false })
  @IsOptional()
  @IsString()
  note?: string
}
