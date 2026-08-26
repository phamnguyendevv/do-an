import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common'

import { NextFunction, Request, Response } from 'express'

import { IFormatExceptionResponse } from '@domain/exceptions/exceptions.interface'

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const isMaintenanceMode = false

    if (isMaintenanceMode) {
      const responseData: IFormatExceptionResponse = {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        path: req.url,
        error: {
          type: 'MAINTENANCE_MODE',
          message: process.env.MAINTENANCE_MESSAGE ?? 'Service Unavailable',
        },
      }

      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(responseData)
    }

    next()
  }
}
