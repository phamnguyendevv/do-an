import { Inject, Injectable } from '@nestjs/common';



import { TaskEntity } from '@domain/entities/task.entity';
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface';
import { ITaskRepositoryInterface, TASK_REPOSITORY } from '@domain/repositories/task.repository.interface';





@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: ITaskRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number; userId: number },
    taskPayload: Partial<TaskEntity>,
  ): Promise<boolean> {
    await this.checkTaskExistence(params)

    return await this.taskRepository.updateTask(params, taskPayload)
  }

  private async checkTaskExistence(params: {
    id: number
    userId: number
  }): Promise<void> {
    const task = await this.taskRepository.findOnTask(params)

    if (!task) {
      throw this.exceptionsService.notFoundException({
        type: 'TaskNotFoundException',
        message: 'Task not found',
      })
    }
  }
}




