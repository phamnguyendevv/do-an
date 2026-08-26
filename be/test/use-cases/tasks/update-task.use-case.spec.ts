import { Test } from '@nestjs/testing'

import { TaskEntity } from '@domain/entities/task.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

import { UpdateTaskUseCase } from '@use-cases/tasks/update-task.use-case'

describe('UpdateTaskUseCase', () => {
  let updateTaskUseCase: UpdateTaskUseCase
  let taskRepository: ITaskRepositoryInterface
  let exceptionsService: IException

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateTaskUseCase,
        {
          provide: TASK_REPOSITORY,
          useValue: {
            updateTask: jest.fn(),
            findOnTask: jest.fn(),
          },
        },
        {
          provide: EXCEPTIONS,
          useValue: {
            notFoundException: jest.fn(),
          },
        },
      ],
    }).compile()

    updateTaskUseCase = moduleRef.get<UpdateTaskUseCase>(UpdateTaskUseCase)
    taskRepository = moduleRef.get<ITaskRepositoryInterface>(TASK_REPOSITORY)
    exceptionsService = moduleRef.get<IException>(EXCEPTIONS)
  })

  describe('execute', () => {
    it('should update the task and return true', async () => {
      const params = { id: 1, userId: '123' }
      const taskPayload: Partial<TaskEntity> = { title: 'New Title' }

      jest
        .spyOn(taskRepository, 'findOnTask')
        .mockResolvedValueOnce({} as TaskEntity)
      jest.spyOn(taskRepository, 'updateTask').mockResolvedValueOnce(true)

      const result = await updateTaskUseCase.execute(params, taskPayload)

      expect(result).toBe(true)
      expect(taskRepository.findOnTask).toHaveBeenCalledWith(params)
      expect(taskRepository.updateTask).toHaveBeenCalledWith(
        params,
        taskPayload,
      )
    })

    it('should throw a not found exception if the task does not exist', async () => {
      const params = { id: 1, userId: '123' }
      const taskPayload: Partial<TaskEntity> = { title: 'New Title' }

      jest.spyOn(taskRepository, 'findOnTask').mockResolvedValueOnce(null)
      jest.spyOn(exceptionsService, 'notFoundException')

      expect(
        await updateTaskUseCase.execute(params, taskPayload),
      ).toBeUndefined()

      expect(taskRepository.findOnTask).toHaveBeenCalledWith(params)
      expect(exceptionsService.notFoundException).toHaveBeenCalledWith({
        type: 'TaskNotFoundException',
        message: 'Task not found',
      })
    })
  })
})
