import { ApiProperty } from '@nestjs/swagger'

import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class CreateTaskDto {
  @ApiProperty({
    required: true,
    maxLength: 255,
    description: 'Task title',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string

  @ApiProperty({
    required: false,
    maxLength: 20000,
    description: 'Task description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string

  @ApiProperty({
    required: false,
    type: Date,
    description: 'Task due date',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date
}
