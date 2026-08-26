import { Inject, Injectable } from '@nestjs/common'

import { TaskEntity } from '@domain/entities/task.entity'
import {
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepositoryInterface,
  ) {}

  async execute(task: Partial<TaskEntity>): Promise<TaskEntity> {
    return await this.taskRepository.createTask(task)
  }
}
