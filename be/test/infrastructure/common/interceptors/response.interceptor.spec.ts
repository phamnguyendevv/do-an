import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { of } from 'rxjs'

import {
  ResponseFormat,
  ResponseInterceptor,
} from '@infrastructure/common/interceptors/response.interceptor'

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile()

    interceptor = module.get<ResponseInterceptor<unknown>>(ResponseInterceptor)
  })

  it('should be defined', () => {
    expect(interceptor).toBeDefined()
  })

  it('should format the response correctly', (done) => {
    const now = Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    const mockRequest = {
      path: '/test-url',
      method: 'GET',
    }

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    } as unknown as ExecutionContext

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ key: 'value' })),
    } as CallHandler

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((response: ResponseFormat<unknown>) => {
        expect(response).toEqual({
          data: { key: 'value' },
          isArray: false,
          path: '/test-url',
          duration: '0ms',
          method: 'GET',
        })
        done()
      })

    jest.spyOn(Date, 'now').mockRestore()
  })

  it('should handle array response data correctly', (done) => {
    const now = Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    const mockRequest = {
      path: '/test-url',
      method: 'GET',
    }

    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    } as unknown as ExecutionContext

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of([{ key: 'value' }])),
    } as CallHandler

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((response: ResponseFormat<unknown>) => {
        expect(response).toEqual({
          data: [{ key: 'value' }],
          isArray: true,
          path: '/test-url',
          duration: '0ms',
          method: 'GET',
        })
        done()
      })

    jest.spyOn(Date, 'now').mockRestore()
  })
})
