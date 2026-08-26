import { ApiProperty, PartialType } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsEnum, IsOptional } from 'class-validator'

import { TaskStatusEnum } from '@domain/entities/task.entity'

import { CreateTaskDto } from './create-task.dto'

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({
    required: false,
    enum: TaskStatusEnum,
    description: '2: Completed, 3: OnGoing',
  })
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsEnum(TaskStatusEnum)
  @IsOptional()
  status?: TaskStatusEnum
}
