import { Inject, Injectable } from '@nestjs/common'

import {
  ICountTasksParams,
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

@Injectable()
export class CountTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepositoryInterface,
  ) {}

  async execute(
    params: ICountTasksParams & { userId: number },
  ): Promise<number> {
    return await this.taskRepository.countTasks(params)
  }
}
