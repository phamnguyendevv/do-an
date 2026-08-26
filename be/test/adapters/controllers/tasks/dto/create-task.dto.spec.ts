import { validate } from 'class-validator'

import { CreateTaskDto } from '@adapters/controllers/tasks/dto/create-task.dto'

describe('CreateTaskDto', () => {
  let dto = new CreateTaskDto()

  beforeEach(() => {
    dto = new CreateTaskDto()

    dto.title = 'Test title'
    dto.description = 'Test description'
    dto.dueDate = new Date().toISOString() as unknown as Date
  })

  it('should be valid when all fields are valid', async () => {
    const errors = await validate(dto)
    expect(errors.length).toEqual(0)
  })

  it('should fail when title is not provided', async () => {
    dto.title = ''
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
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
})
