import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { LoggerService } from '@infrastructure/logger/logger.service'

describe('LoggerService', () => {
  let loggerService: LoggerService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile()

    loggerService = moduleRef.get<LoggerService>(LoggerService)
  })

  it('should be defined', () => {
    expect(loggerService).toBeDefined()
  })

  it('should log debug message in development environment', () => {
    const debugSpy = jest.spyOn(Logger.prototype, 'debug')

    process.env.NODE_ENV = 'local'
    loggerService.debug('Context', 'Message')

    expect(debugSpy).toHaveBeenCalled()
    expect(debugSpy.mock.calls[0]).toEqual(['[DEBUG] Message', 'Context'])

    process.env.NODE_ENV = 'production'
    loggerService.debug('Context', 'Message')
    expect(debugSpy).toHaveBeenCalledTimes(1)
  })

  it('should log info message', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log')

    loggerService.log('Context', 'Message')

    expect(logSpy).toHaveBeenCalled()
    expect(logSpy.mock.calls[0]).toEqual(['[INFO] Message', 'Context'])
  })

  it('should log error message', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error')

    loggerService.error('Context', 'Message', 'Trace')

    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0]).toEqual([
      '[ERROR] Message',
      'Trace',
      'Context',
    ])
  })

  it('should log warn message', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn')

    loggerService.warn('Context', 'Message')

    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]).toEqual(['[WARN] Message', 'Context'])
  })

  it('should log verbose message in development environment', () => {
    const verboseSpy = jest.spyOn(Logger.prototype, 'verbose')

    process.env.NODE_ENV = 'local'
    loggerService.verbose('Context', 'Message')

    expect(verboseSpy).toHaveBeenCalled()
    expect(verboseSpy.mock.calls[0]).toEqual(['[VERBOSE] Message', 'Context'])

    process.env.NODE_ENV = 'production'
    loggerService.debug('Context', 'Message')
    expect(verboseSpy).toHaveBeenCalledTimes(1)
  })
})
