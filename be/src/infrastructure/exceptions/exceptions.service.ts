import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'

import {
  IException,
  IFormatExceptionMessage,
} from '@domain/exceptions/exceptions.interface'

@Injectable()
export class ExceptionsService implements IException {
  badRequestException(data: IFormatExceptionMessage): Error {
    throw new BadRequestException(data)
  }
  internalServerErrorException(data?: IFormatExceptionMessage): Error {
    throw new InternalServerErrorException(data)
  }
  forbiddenException(data?: IFormatExceptionMessage): Error {
    throw new ForbiddenException(data)
  }
  unauthorizedException(data?: IFormatExceptionMessage): Error {
    throw new UnauthorizedException(data)
  }
  notFoundException(data?: IFormatExceptionMessage): Error {
    throw new NotFoundException(data)
  }
}
