import { ApiProperty } from '@nestjs/swagger'

import { TaskStatusEnum } from '@domain/entities/task.entity'

export class GetListTasksPresenter {
  @ApiProperty()
  id: number

  @ApiProperty()
  title: string

  @ApiProperty({
    required: true,
    enum: TaskStatusEnum,
    description: '2: Completed, 3: OnGoing',
  })
  status: TaskStatusEnum

  @ApiProperty({ required: false })
  description?: string

  @ApiProperty({ required: false })
  dueDate?: Date

  constructor({
    id,
    title,
    status,
    description,
    dueDate,
  }: GetListTasksPresenter) {
    this.id = id
    this.title = title
    this.status = status
    this.description = description
    this.dueDate = dueDate
  }
}
