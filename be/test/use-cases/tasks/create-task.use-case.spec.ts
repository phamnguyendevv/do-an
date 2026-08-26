import { Test, TestingModule } from '@nestjs/testing'

import { createTaskStub } from 'test/stubs/task.stub'

import {
  ITaskRepositoryInterface,
  TASK_REPOSITORY,
} from '@domain/repositories/task.repository.interface'

import { CreateTaskUseCase } from '@use-cases/tasks/create-task.use-case'

describe('CreateTaskUseCase', () => {
  let useCase: CreateTaskUseCase
  let taskRepository: ITaskRepositoryInterface

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTaskUseCase,
        {
          provide: TASK_REPOSITORY,
          useValue: {
            createTask: jest.fn(),
          },
        },
      ],
    }).compile()

    useCase = module.get<CreateTaskUseCase>(CreateTaskUseCase)
    taskRepository = module.get<ITaskRepositoryInterface>(TASK_REPOSITORY)
  })

  it('should create a task', async () => {
    const task = { title: 'Task 1' }
    const createdTask = createTaskStub()

    jest.spyOn(taskRepository, 'createTask').mockResolvedValueOnce(createdTask)

    const result = await useCase.execute(task)

    expect(taskRepository.createTask).toHaveBeenCalledWith(task)
    expect(result).toEqual(createdTask)
  })
})
