import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty } from 'class-validator'

export class MonthlyRevenueDto {
  @ApiProperty({ example: '08', description: 'Month' })
  @IsNotEmpty()
  month!: number

  @ApiProperty({ example: '2024', description: 'Year' })
  @IsNotEmpty()
  year!: number
}
