import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

@Injectable()
export class GetDetailTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: { id: number; userId: number }) {
    const task = await this.taskRepository.findOnTask(payload)

    if (!task) {
      throw this.exceptionsService.notFoundException({
        type: 'TaskNotFoundException',
        message: 'Task not found',
      })
    }

    return task
  }
}
