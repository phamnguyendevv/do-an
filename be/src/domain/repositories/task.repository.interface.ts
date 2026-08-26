import { TaskEntity, TaskStatusEnum } from '../entities/task.entity'

export interface ISearchTasksParams {
  status?: TaskStatusEnum
  size?: number
}

export interface ICountTasksParams {
  status?: TaskStatusEnum
}

export const TASK_REPOSITORY = 'TASK_REPOSITORY_INTERFACE'
export interface ITaskRepositoryInterface {
  findTasks(
    payload: ISearchTasksParams & { userId: number },
  ): Promise<TaskEntity[]>
  createTask(task: Partial<TaskEntity>): Promise<TaskEntity>
  findOnTask(payload: {
    id: number
    userId: number
  }): Promise<TaskEntity | null>
  updateTask(
    params: {
      id: number
      userId: number
    },
    task: Partial<TaskEntity>,
  ): Promise<boolean>
  countTasks(params: ICountTasksParams & { userId: number }): Promise<number>
}
