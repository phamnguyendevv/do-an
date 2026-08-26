import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty } from "class-validator"

export class DailyRevenueDto {
  @ApiProperty({ example: '2024-08-01', description: 'Date' })
  @IsNotEmpty()
  date!: string
 
}