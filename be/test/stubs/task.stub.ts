import { TaskEntity, TaskStatusEnum } from '@domain/entities/task.entity'

export const createTaskStub = (): TaskEntity => {
  return {
    id: 1,
    title: 'Task 1',
    description: 'Description 1',
    status: TaskStatusEnum.Completed,
    userId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date(),
  }
}
