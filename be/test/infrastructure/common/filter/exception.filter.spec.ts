import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { AllExceptionFilter } from '@infrastructure/common/filter/exception.filter'
import { LoggerService } from '@infrastructure/logger/logger.service'

describe('AllExceptionFilter', () => {
  let filter: AllExceptionFilter
  let loggerService: LoggerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionFilter,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile()

    filter = module.get<AllExceptionFilter>(AllExceptionFilter)
    loggerService = module.get<LoggerService>(LoggerService)
  })

  it('should be defined', () => {
    expect(filter).toBeDefined()
  })

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const mockHttpException = new HttpException(
        {
          type: 'HttpException',
          message: 'Forbidden',
        },
        HttpStatus.FORBIDDEN,
      )
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
      const mockRequest = {
        url: '/test-url',
        path: '/test-url',
        method: 'GET',
      }
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnThis(),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      } as unknown as ArgumentsHost

      filter.catch(mockHttpException, mockArgumentsHost)

      const expectedResponseData = {
        statusCode: HttpStatus.FORBIDDEN,
        path: mockRequest.url,
        error: {
          type: 'HttpException',
          message: 'Forbidden',
        },
        timestamp: expect.any(String),
      }

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponseData)
      expect(loggerService.warn).toHaveBeenCalledWith(
        `End Request for ${mockRequest.url}`,
        `method=${mockRequest.method} status=${HttpStatus.FORBIDDEN} type=${mockHttpException.name} message=${mockHttpException.message}`,
      )
    })

    it('should handle non-HttpException correctly', () => {
      const mockError = new Error('Internal Server Error')
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
      const mockRequest = {
        url: '/test-url',
        path: '/test-url',
        method: 'GET',
      }
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnThis(),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      } as unknown as ArgumentsHost

      filter.catch(mockError as HttpException, mockArgumentsHost)

      const expectedResponseData = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: {
          type: 'Error',
          message: 'Internal Server Error',
        },
      }

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponseData)
      expect(loggerService.error).toHaveBeenCalledWith(
        `End Request for ${mockRequest.url}`,
        `method=${mockRequest.method} status=${HttpStatus.INTERNAL_SERVER_ERROR} type=${mockError.name} message=${mockError.message}`,
        expect.any(String),
      )
    })
  })
})
