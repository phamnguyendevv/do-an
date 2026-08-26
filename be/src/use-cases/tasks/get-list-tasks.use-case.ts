import { Inject, Injectable } from '@nestjs/common'

import { TaskEntity } from '@domain/entities/task.entity'
import {
  ISearchTasksParams,
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

@Injectable()
export class GetListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchTasksParams & { userId: number },
  ): Promise<TaskEntity[]> {
    return await this.taskRepository.findTasks(queryParams)
  }
}
