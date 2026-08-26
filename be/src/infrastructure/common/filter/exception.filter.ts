import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

import { Request, Response } from 'express'

import {
  IFormatExceptionMessage,
  IFormatExceptionResponse,
} from '@domain/exceptions/exceptions.interface'

import { LoggerService } from '@infrastructure/logger/logger.service'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR
    const error =
      exception instanceof HttpException
        ? (exception.getResponse() as IFormatExceptionMessage)
        : {
            type: (exception as Error).name,
            message: (exception as Error).message,
          }

    const responseData: IFormatExceptionResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: error,
    }

    this.logMessage(request, error, status, exception)

    response.status(status).json(responseData)
  }

  private logMessage(
    request: Request,
    error: IFormatExceptionMessage,
    status: number,
    exception: HttpException,
  ) {
    const ip = this.getIP(request)

    if (status === 500) {
      this.logger.error(
        `End Request for ${request.path}`,
        {
          method: request.method,
          ip,
          status,
          error: error,
        },
        exception.stack,
      )
    } else {
      this.logger.warn(`End Request for ${request.path}`, {
        method: request.method,
        ip,
        status,
        error: error,
      })
    }
  }

  private getIP(request: Request): string {
    let ip: string
    const ipAddr = request.headers['x-forwarded-for']
    if (ipAddr) {
      const list = typeof ipAddr === 'string' ? ipAddr.split(',') : ipAddr
      ip = list[list.length - 1]
    } else {
      ip = request.ip || ''
    }
    return ip.replace('::ffff:', '')
  }
}
