import { Test, TestingModule } from '@nestjs/testing'

import { createTaskStub } from 'test/stubs/task.stub'

import { TaskStatusEnum } from '@domain/entities/task.entity'

import { CountTasksUseCase } from '@use-cases/tasks/count-tasks.use-case'
import { CreateTaskUseCase } from '@use-cases/tasks/create-task.use-case'
import { GetDetailTaskUseCase } from '@use-cases/tasks/get-detail-task.use-case'
import { GetListTasksUseCase } from '@use-cases/tasks/get-list-tasks.use-case'
import { UpdateTaskUseCase } from '@use-cases/tasks/update-task.use-case'

import { CountTasksDto } from '@adapters/controllers/tasks/dto/count-tasks.dto'
import { CreateTaskDto } from '@adapters/controllers/tasks/dto/create-task.dto'
import { GetListTasksDto } from '@adapters/controllers/tasks/dto/get-list-tasks.dto'
import { UpdateTaskDto } from '@adapters/controllers/tasks/dto/update-task.dto'
import { CountTasksPresenter } from '@adapters/controllers/tasks/presenters/count-tasks.presenter'
import { CreateTaskPresenter } from '@adapters/controllers/tasks/presenters/create-tasks.presenter'
import { GetDetailTaskPresenter } from '@adapters/controllers/tasks/presenters/get-detail-task.presenter'
import { GetListTasksPresenter } from '@adapters/controllers/tasks/presenters/get-list-tasks.presenter'
import { TasksController } from '@adapters/controllers/tasks/tasks.controller'

describe('TasksController', () => {
  let controller: TasksController
  let getListTasksUseCase: GetListTasksUseCase
  let createTaskUseCase: CreateTaskUseCase
  let getDetailTaskUseCase: GetDetailTaskUseCase
  let updateTaskUseCase: UpdateTaskUseCase
  let countTasksUseCase: CountTasksUseCase

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: GetListTasksUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CreateTaskUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetDetailTaskUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateTaskUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CountTasksUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<TasksController>(TasksController)
    getListTasksUseCase = module.get<GetListTasksUseCase>(GetListTasksUseCase)
    createTaskUseCase = module.get<CreateTaskUseCase>(CreateTaskUseCase)
    getDetailTaskUseCase =
      module.get<GetDetailTaskUseCase>(GetDetailTaskUseCase)
    updateTaskUseCase = module.get<UpdateTaskUseCase>(UpdateTaskUseCase)
    countTasksUseCase = module.get<CountTasksUseCase>(CountTasksUseCase)
  })

  describe('count', () => {
    it('should call countTasksUseCase.execute and return the result', async () => {
      const countTasksDto: CountTasksDto = {
        status: TaskStatusEnum.Completed,
      }
      const userId = 'user-id'

      const count = 10
      jest.spyOn(countTasksUseCase, 'execute').mockResolvedValue(count)

      const result = await controller.count(countTasksDto, userId)

      expect(countTasksUseCase.execute).toHaveBeenCalledWith({
        userId: userId,
        ...countTasksDto,
      })
      expect(result).toEqual(new CountTasksPresenter({ count }))
    })
  })

  describe('findAll', () => {
    it('should call getListTasksUseCase.execute and return the result', async () => {
      const getListTasksDto: GetListTasksDto = {
        status: TaskStatusEnum.Completed,
        size: 10,
      }
      const userId = 'user-id'

      const tasks = [createTaskStub()]
      jest.spyOn(getListTasksUseCase, 'execute').mockResolvedValue(tasks)

      const result = await controller.findAll(getListTasksDto, userId)

      expect(getListTasksUseCase.execute).toHaveBeenCalledWith({
        ...getListTasksDto,
        userId: userId,
      })
      expect(result).toEqual(
        tasks.map((task) => new GetListTasksPresenter(task)),
      )
    })
  })

  describe('create', () => {
    it('should call createTaskUseCase.execute and return the result', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task title',
      }
      const userId = 'user-id'

      const task = createTaskStub()
      jest.spyOn(createTaskUseCase, 'execute').mockResolvedValue(task)

      const result = await controller.create(createTaskDto, userId)

      expect(createTaskUseCase.execute).toHaveBeenCalledWith({
        ...createTaskDto,
        userId: userId,
      })

      expect(result).toEqual(new CreateTaskPresenter(task))
    })
  })

  describe('findOne', () => {
    it('should call getDetailTaskUseCase.execute and return the result', async () => {
      const userId = 'user-id'
      const id = 1

      const task = createTaskStub()
      jest.spyOn(getDetailTaskUseCase, 'execute').mockResolvedValue(task)

      const result = await controller.findOne(userId, id)

      expect(getDetailTaskUseCase.execute).toHaveBeenCalledWith({
        id: id,
        userId: userId,
      })
      expect(result).toEqual(new GetDetailTaskPresenter(task))
    })
  })

  describe('update', () => {
    it('should call updateTaskUseCase.execute and return the result', async () => {
      const userId = 'user-id'
      const id = 1
      const updateTaskDto: UpdateTaskDto = {
        description: 'Test description',
      }

      const isUpdated = true
      jest.spyOn(updateTaskUseCase, 'execute').mockResolvedValue(isUpdated)

      const result = await controller.update(userId, id, updateTaskDto)

      expect(updateTaskUseCase.execute).toHaveBeenCalledWith(
        {
          id: id,
          userId: userId,
        },
        updateTaskDto,
      )
      expect(result).toEqual(isUpdated)
    })
  })
})
