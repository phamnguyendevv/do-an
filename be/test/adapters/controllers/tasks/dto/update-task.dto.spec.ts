import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'

import { TaskStatusEnum } from '@domain/entities/task.entity'

import { UpdateTaskDto } from '@adapters/controllers/tasks/dto/update-task.dto'

describe('UpdateTaskDto', () => {
  let dto = new UpdateTaskDto()

  beforeEach(() => {
    dto = new UpdateTaskDto()
    dto.title = 'Test title'
    dto.description = 'Test description'
    dto.dueDate = new Date().toISOString() as unknown as Date
    dto.status = TaskStatusEnum.Completed
  })

  it('should be valid when all fields are valid', async () => {
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should fail when title is empty', async () => {
    dto.title = ''
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should be valid when title is not provided', async () => {
    dto.title = undefined
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should fail when title is not a string', async () => {
    dto.title = 123 as unknown as string
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should fail when title exceeds the maximum length', async () => {
    dto.title = 'a'.repeat(256)
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should fail when description is not a string', async () => {
    dto.description = 123 as unknown as string
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should fail when description exceeds the maximum length', async () => {
    dto.description = 'a'.repeat(20001)
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should be valid when description is not provided', async () => {
    dto.description = undefined
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should fail when dueDate is not a valid date string', async () => {
    dto.dueDate = 'invalid date' as unknown as Date
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should be valid when dueDate is not provided', async () => {
    dto.dueDate = undefined
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should be valid if status is not provided', async () => {
    dto.status = undefined
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should fail if status is not a valid TaskStatusEnum', async () => {
    dto.status = 'invalid status' as unknown as TaskStatusEnum
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  describe('Transform', () => {
    it('should transform string to number before validation for status', async () => {
      const dtoTransform = plainToClass(UpdateTaskDto, {
        ...dto,
        status: TaskStatusEnum.Completed.toString(),
      })
      const validationErrors = await validate(dtoTransform)
      expect(validationErrors.length).toEqual(0)
      expect(typeof dtoTransform.status).toBe('number')
      expect(dtoTransform.status).toEqual(TaskStatusEnum.Completed)
    })
  })
})
