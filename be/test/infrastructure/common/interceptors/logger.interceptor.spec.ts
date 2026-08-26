import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { Request } from 'express'
import { of } from 'rxjs'
import { tap } from 'rxjs/operators'

import { LoggingInterceptor } from '@infrastructure/common/interceptors/logger.interceptor'
import { LoggerService } from '@infrastructure/logger/logger.service'

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor
  let loggerService: LoggerService
  let next: CallHandler

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile()

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor)
    loggerService = module.get<LoggerService>(LoggerService)
    next = {
      handle: jest.fn(() => of(null).pipe(tap(() => {}))),
    } as CallHandler
  })

  it('should be defined', () => {
    expect(interceptor).toBeDefined()
  })

  describe('intercept', () => {
    const createMockRequest = (options: Partial<Request> = {}): Request =>
      ({
        path: '/test-url',
        method: 'GET',
        headers: {},
        ip: '127.0.0.1',
        ...options,
      }) as Request

    const createMockExecutionContext = (request: Request): ExecutionContext =>
      ({
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnValue(request),
      }) as unknown as ExecutionContext

    it('should log incoming and outgoing requests', () => {
      const now = Date.now()
      jest.spyOn(Date, 'now').mockImplementation(() => now)

      const mockRequest = createMockRequest()
      const mockExecutionContext = createMockExecutionContext(mockRequest)

      const responseInterceptor = interceptor.intercept(
        mockExecutionContext,
        next,
      )

      responseInterceptor.subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenCalledWith(
            'Incoming Request on /test-url',
            'method=GET ip=127.0.0.1',
          )
        },
        complete: () => {
          expect(loggerService.log).toHaveBeenCalledWith(
            'End Request for /test-url',
            `method=GET ip=127.0.0.1 duration=${Date.now() - now}ms`,
          )
        },
      })
    })

    it('should extract IP address from x-forwarded-for header', () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.1,192.168.1.2',
        },
      })

      const ip = interceptor['getIP'](mockRequest)
      expect(ip).toBe('192.168.1.2')
    })

    it('should extract IP address from remoteAddress when x-forwarded-for header is missing', () => {
      const mockRequest = createMockRequest()

      const ip = interceptor['getIP'](mockRequest)
      expect(ip).toBe('127.0.0.1')
    })

    it('should extract IP address from remoteAddress when x-forwarded-for header is an array of strings', () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-forwarded-for': ['192.168.1.1', '192.168.1.2'],
        },
      })

      const ip = interceptor['getIP'](mockRequest)
      expect(ip).toBe('192.168.1.2')
    })
  })
})
