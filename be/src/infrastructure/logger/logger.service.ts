import { ConsoleLogger, Injectable } from '@nestjs/common'

import { ILogger } from '@domain/logger/logger.interface'

@Injectable()
export class LoggerService extends ConsoleLogger implements ILogger {
  constructor() {
    super({
      json: true,
      colors: true,
      compact: process.env.NODE_ENV === 'production',
    })
  }

  debug(context: string, message: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      super.debug(message, context)
    }
  }
  log(context: string, message: unknown) {
    super.log(message, context)
  }
  error(context: string, message: unknown, trace?: string) {
    super.error(message, trace, context)
  }
  warn(context: string, message: unknown) {
    super.warn(message, context)
  }
  verbose(context: string, message: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      super.verbose(message, context)
    }
  }
}
