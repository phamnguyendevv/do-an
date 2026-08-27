import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class AddOrderNoteDto {
  @ApiProperty({ description: 'Nội dung ghi chú xử lý đơn hàng', example: 'Khách yêu cầu giao trước 17h' })
  @IsNotEmpty({ message: 'Nội dung ghi chú không được để trống' })
  @IsString()
  note!: string
}
