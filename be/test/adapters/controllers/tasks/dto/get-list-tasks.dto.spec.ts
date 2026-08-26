import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'

import { TaskStatusEnum } from '@domain/entities/task.entity'

import { GetListTasksDto } from '@adapters/controllers/tasks/dto/get-list-tasks.dto'

describe('GetListTasksDto', () => {
  let dto: GetListTasksDto

  beforeEach(() => {
    dto = new GetListTasksDto()
  })

  it('should be valid when no properties are provided', async () => {
    const validationErrors = await validate(dto)
    expect(validationErrors.length).toEqual(0)
  })

  it('should be valid when status is a valid TaskStatusEnum value', async () => {
    dto.status = TaskStatusEnum.Completed
    const validationErrors = await validate(dto)
    expect(validationErrors.length).toEqual(0)
  })

  it('should be invalid when status is not a valid TaskStatusEnum value', async () => {
    dto.status = 123 as TaskStatusEnum
    const validationErrors = await validate(dto)
    expect(validationErrors.length).toBeGreaterThan(0)
  })

  it('should be valid when size is a positive number', async () => {
    dto.size = 10
    const validationErrors = await validate(dto)
    expect(validationErrors.length).toEqual(0)
  })

  it('should be invalid when size is a negative number', async () => {
    dto.size = -10
    const validationErrors = await validate(dto)
    expect(validationErrors.length).toBeGreaterThan(0)
  })

  describe('Transform', () => {
    it('should transform string to number before validation for status', async () => {
      const dtoTransform = plainToClass(GetListTasksDto, {
        ...dto,
        status: TaskStatusEnum.Completed.toString(),
      })
      const validationErrors = await validate(dtoTransform)
      expect(validationErrors.length).toEqual(0)
      expect(typeof dtoTransform.status).toBe('number')
      expect(dtoTransform.status).toEqual(TaskStatusEnum.Completed)
    })

    it('should transform string to number before validation for size', async () => {
      const dtoTransform = plainToClass(GetListTasksDto, {
        ...dto,
        size: '10',
      })
      const validationErrors = await validate(dtoTransform)
      expect(validationErrors.length).toEqual(0)
      expect(typeof dtoTransform.size).toBe('number')
      expect(dtoTransform.size).toEqual(10)
    })
  })
})
