import { ExecutionContext } from '@nestjs/common'
import { HttpArgumentsHost } from '@nestjs/common/interfaces'

import { UserEntity } from '@domain/entities/user.entity'

import { USER_FACTORY_DATA } from '@adapters/controllers/common/decorators/user.decorator'

describe('USER_FACTORY_DATA', () => {
  let mockExecutionContext: jest.Mocked<ExecutionContext>
  let mockHttp: jest.Mocked<HttpArgumentsHost>

  beforeEach(() => {
    mockHttp = {
      getRequest: jest.fn(),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttp),
      getRequest: jest.fn(),
      getType: jest.fn(),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>
  })

  const executeFactory = (
    data: keyof UserEntity | undefined,
    context: ExecutionContext,
  ) => {
    return USER_FACTORY_DATA(data, context)
  }

  it('should return the user object from the request', () => {
    const mockUser = { id: 1, email: 'test@example.com' } as any
    mockHttp.getRequest.mockReturnValue({ user: mockUser })

    const result = executeFactory(undefined, mockExecutionContext)
    expect(result).toEqual(mockUser)
  })

  it('should return a specific property of the user object from the request', () => {
    const mockUser = { id: 1, email: 'test@example.com' } as any
    mockHttp.getRequest.mockReturnValue({ user: mockUser })

    const result = executeFactory('email', mockExecutionContext)
    expect(result).toBe('test@example.com')
  })

  it('should return undefined if the user object is not present in the request', () => {
    mockHttp.getRequest.mockReturnValue({})

    const result = executeFactory(undefined, mockExecutionContext)
    expect(result).toBeUndefined()
  })
})
