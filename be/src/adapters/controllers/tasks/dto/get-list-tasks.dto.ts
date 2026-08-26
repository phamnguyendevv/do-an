import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator'

import { TaskStatusEnum } from '@domain/entities/task.entity'
import { ISearchTasksParams } from '@domain/repositories/task.repository.interface'

export class GetListTasksDto implements ISearchTasksParams {
  @ApiProperty({
    required: false,
    enum: TaskStatusEnum,
    description: '2: Completed, 3: OnGoing, empty: All',
  })
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsEnum(TaskStatusEnum)
  @IsOptional()
  status?: TaskStatusEnum

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  size?: number
}
