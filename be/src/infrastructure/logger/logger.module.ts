import { Module } from '@nestjs/common'

import { LOGGER } from '@domain/logger/logger.interface'

import { LoggerService } from './logger.service'

@Module({
  providers: [
    LoggerService,
    {
      provide: LOGGER,
      useExisting: LoggerService,
    },
  ],
  exports: [LoggerService, LOGGER],
})
export class LoggerModule {}
