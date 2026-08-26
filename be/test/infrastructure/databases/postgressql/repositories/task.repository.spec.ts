import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { createTaskStub } from 'test/stubs/task.stub'
import { Repository, UpdateResult } from 'typeorm'

import { TaskStatusEnum } from '@domain/entities/task.entity'

import { Task } from '@infrastructure/databases/postgressql/entities/task.entity'
import { TaskRepository } from '@infrastructure/databases/postgressql/repositories/task.repository'

describe('TaskRepository', () => {
  let taskRepository: TaskRepository
  let taskEntityRepository: Repository<Task>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskRepository,
        {
          provide: getRepositoryToken(Task),
          useClass: Repository,
        },
      ],
    }).compile()

    taskRepository = moduleRef.get<TaskRepository>(TaskRepository)
    taskEntityRepository = moduleRef.get<Repository<Task>>(
      getRepositoryToken(Task),
    )
  })

  describe('findTasks', () => {
    it('should return an array of tasks', async () => {
      const mockTasks: Task[] = [createTaskStub()]
      const mockParams = {
        size: 10,
        status: TaskStatusEnum.Completed,
        userId: 'user123',
      }

      jest.spyOn(taskEntityRepository, 'find').mockResolvedValueOnce(mockTasks)

      const result = await taskRepository.findTasks(mockParams)

      expect(result).toEqual(mockTasks)
      expect(taskEntityRepository.find).toHaveBeenCalledWith({
        where: {
          userId: mockParams.userId,
          status: mockParams.status,
        },
        select: ['id', 'title', 'status', 'description', 'dueDate'],
        take: mockParams.size,
        order: {
          id: 'DESC',
        },
      })
    })
  })

  describe('createTask', () => {
    it('should create a new task', async () => {
      const mockTask: Partial<Task> = {
        title: 'Task title',
      }
      const mockNewTask: Task = {
        ...createTaskStub(),
        ...mockTask,
      }

      jest
        .spyOn(taskEntityRepository, 'create')
        .mockReturnValueOnce(mockNewTask)
      jest
        .spyOn(taskEntityRepository, 'save')
        .mockResolvedValueOnce(mockNewTask)

      const result = await taskRepository.createTask(mockTask)

      expect(result).toEqual(mockNewTask)
      expect(taskEntityRepository.create).toHaveBeenCalledWith(mockTask)
      expect(taskEntityRepository.save).toHaveBeenCalledWith(mockNewTask)
    })
  })

  describe('findOnTask', () => {
    it('should return a task', async () => {
      const mockTask: Task = createTaskStub()
      const mockParams = {
        id: 1,
        userId: 'user123',
      }

      jest
        .spyOn(taskEntityRepository, 'findOne')
        .mockResolvedValueOnce(mockTask)

      const result = await taskRepository.findOnTask(mockParams)

      expect(result).toEqual(mockTask)
      expect(taskEntityRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockParams.id,
          userId: mockParams.userId,
        },
      })
    })
  })

  describe('updateTask', () => {
    it('should update a task', async () => {
      const mockParams = {
        id: 1,
        userId: 'user123',
      }
      const mockTask: Partial<Task> = {
        description: 'Test description',
      }

      jest
        .spyOn(taskEntityRepository, 'update')
        .mockResolvedValueOnce({ affected: 1 } as UpdateResult)

      const result = await taskRepository.updateTask(mockParams, mockTask)

      expect(result).toEqual(true)
      expect(taskEntityRepository.update).toHaveBeenCalledWith(
        {
          id: mockParams.id,
          userId: mockParams.userId,
        },
        mockTask,
      )
    })

    it('should return false if task is not found', async () => {
      const mockParams = {
        id: 1,
        userId: 'user123',
      }
      const mockTask: Partial<Task> = {
        description: 'Test description',
      }

      jest
        .spyOn(taskEntityRepository, 'update')
        .mockResolvedValueOnce({ affected: 0 } as UpdateResult)

      const result = await taskRepository.updateTask(mockParams, mockTask)

      expect(result).toEqual(false)
      expect(taskEntityRepository.update).toHaveBeenCalledWith(
        {
          id: mockParams.id,
          userId: mockParams.userId,
        },
        mockTask,
      )
    })
  })

  describe('countTasks', () => {
    it('should return the number of tasks', async () => {
      const mockParams = {
        userId: 'user123',
        status: TaskStatusEnum.Completed,
      }

      jest.spyOn(taskEntityRepository, 'count').mockResolvedValueOnce(10)

      const result = await taskRepository.countTasks(mockParams)

      expect(result).toEqual(10)
      expect(taskEntityRepository.count).toHaveBeenCalledWith({
        where: {
          userId: mockParams.userId,
          status: mockParams.status,
        },
      })
    })
  })
})
