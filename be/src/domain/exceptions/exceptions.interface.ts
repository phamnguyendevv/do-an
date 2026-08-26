export interface IFormatExceptionMessage {
  type: string
  message: string
}

export interface IFormatExceptionResponse {
  statusCode: number
  timestamp: string // ISO date string
  path: string
  error: {
    type: string
    message: string
  }
}

export const EXCEPTIONS = 'IException'
export interface IException {
  badRequestException(data: IFormatExceptionMessage): Error
  internalServerErrorException(data?: IFormatExceptionMessage): Error
  forbiddenException(data?: IFormatExceptionMessage): Error
  unauthorizedException(data?: IFormatExceptionMessage): Error
  notFoundException(data?: IFormatExceptionMessage): Error
}
