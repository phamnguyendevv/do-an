import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import {
  ICountTasksParams,
  ISearchTasksParams,
  ITaskRepositoryInterface,
} from '@domain/repositories/task.repository.interface'

import { Task } from '../entities/task.entity'

const DEFAULT_SELECT_FIELDS: (keyof Task)[] = [
  'id',
  'title',
  'status',
  'description',
  'dueDate',
]

@Injectable()
export class TaskRepository implements ITaskRepositoryInterface {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async findTasks({
    size,
    status,
    userId,
  }: ISearchTasksParams & { userId: number }): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      where: {
        userId: userId,
        status: status,
      },
      select: DEFAULT_SELECT_FIELDS,
      take: size,
      order: {
        id: 'DESC',
      },
    })

    return tasks
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const newTask = this.taskRepository.create(task)
    await this.taskRepository.save(newTask)

    return newTask
  }

  async findOnTask({
    id,
    userId,
  }: {
    id: number
    userId: number
  }): Promise<Task | null> {
    return await this.taskRepository.findOne({
      where: {
        id: id,
        userId: userId,
      },
    })
  }

  async updateTask(
    {
      id,
      userId,
    }: {
      id: number
      userId: number
    },
    task: Partial<Task>,
  ): Promise<boolean> {
    const updatedTask = await this.taskRepository.update(
      {
        id: id,
        userId: userId,
      },
      task,
    )

    if (updatedTask.affected === 0) return false

    return true
  }

  async countTasks({
    userId,
    status,
  }: ICountTasksParams & { userId: number }): Promise<number> {
    return await this.taskRepository.count({
      where: {
        userId: userId,
        status: status,
      },
    })
  }
}
