import { ArgumentMetadata, BadRequestException } from '@nestjs/common'

import { IsInt, IsString, Max, Min } from 'class-validator'

import { ValidationPipe } from '@infrastructure/common/pipes/validation.pipe'

class TestDto {
  @IsString()
  name!: string

  @IsInt()
  @Min(0)
  @Max(100)
  age!: number
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe

  beforeEach(() => {
    pipe = new ValidationPipe()
  })

  it('should be defined', () => {
    expect(pipe).toBeDefined()
  })

  it('should pass validation for valid input', async () => {
    const metadata: ArgumentMetadata = {
      metatype: TestDto,
      type: 'body',
      data: '',
    }
    const value = { name: 'John', age: 30 }

    await expect(pipe.transform(value, metadata)).resolves.toEqual(value)
  })

  it('should throw BadRequestException for invalid input', async () => {
    const metadata: ArgumentMetadata = {
      metatype: TestDto,
      type: 'body',
      data: '',
    }
    const value = { name: 123, age: 150 }

    await expect(pipe.transform(value, metadata)).rejects.toThrow(
      BadRequestException,
    )
  })

  it('should format errors correctly', async () => {
    const metadata: ArgumentMetadata = {
      metatype: TestDto,
      type: 'body',
      data: '',
    }
    const value = { name: 123, age: 150 }

    try {
      await pipe.transform(value, metadata)
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      if (error instanceof BadRequestException) {
        const response = (error.getResponse() as { message: string }).message
        const expectedErrors: object[] = [
          {
            property: 'name',
            errors: ['isString'],
            constraints: { isString: 'name must be a string' },
          },
          {
            property: 'age',
            errors: ['max'],
            constraints: {
              max: 'age must not be greater than 100',
            },
          },
        ]
        expect(response).toEqual(expectedErrors)
      }
    }
  })

  it('should skip validation if no metatype', async () => {
    const metadata: ArgumentMetadata = {
      metatype: undefined,
      type: 'body',
      data: '',
    }
    const value = { name: 'John', age: 30 }

    await expect(pipe.transform(value, metadata)).resolves.toEqual(value)
  })

  it('should skip validation for built-in types', async () => {
    const metadata: ArgumentMetadata = {
      metatype: String,
      type: 'body',
      data: '',
    }
    const value = 'This is a string'

    await expect(pipe.transform(value, metadata)).resolves.toEqual(value)
  })
})
