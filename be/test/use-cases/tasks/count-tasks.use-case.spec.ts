import { Test } from '@nestjs/testing'

import {
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

import { CountTasksUseCase } from '@use-cases/tasks/count-tasks.use-case'

describe('CountTasksUseCase', () => {
  let countTasksUseCase: CountTasksUseCase
  let taskRepository: ITaskRepositoryInterface

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CountTasksUseCase,
        {
          provide: TASK_REPOSITORY,
          useValue: {
            countTasks: jest.fn(),
          },
        },
      ],
    }).compile()

    countTasksUseCase = moduleRef.get<CountTasksUseCase>(CountTasksUseCase)
    taskRepository = moduleRef.get<ITaskRepositoryInterface>(TASK_REPOSITORY)
  })

  describe('execute', () => {
    it('should call taskRepository.countTasks with the correct params', async () => {
      const params = {
        userId: 'testUserId',
      }

      await countTasksUseCase.execute(params)

      expect(taskRepository.countTasks).toHaveBeenCalledWith(params)
    })

    it('should return the result from taskRepository.countTasks', async () => {
      const params = {
        userId: 'testUserId',
      }
      const expectedResult = 5
      ;(taskRepository.countTasks as jest.Mock).mockResolvedValue(
        expectedResult,
      )

      const result = await countTasksUseCase.execute(params)

      expect(result).toBe(expectedResult)
    })
  })
})
