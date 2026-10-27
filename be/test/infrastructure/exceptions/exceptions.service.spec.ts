import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'

describe('ExceptionsService', () => {
  let service: ExceptionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExceptionsService],
    }).compile()

    service = module.get<ExceptionsService>(ExceptionsService)
  })

  it('should throw BadRequestException', () => {
    const data = { type: 'BadRequest', message: 'Bad Request' }
    expect(() => service.badRequestException(data)).toThrow(BadRequestException)
  })

  it('should throw InternalServerErrorException', () => {
    const data = {
      type: 'InternalServerError',
      message: 'Internal Server Error',
    }
    expect(() => service.internalServerErrorException(data)).toThrow(
      InternalServerErrorException,
    )
  })

  it('should throw ForbiddenException', () => {
    const data = { type: 'Forbidden', message: 'Forbidden' }
    expect(() => service.forbiddenException(data)).toThrow(ForbiddenException)
  })

  it('should throw UnauthorizedException', () => {
    const data = { type: 'Unauthorized', message: 'Unauthorized' }
    expect(() => service.unauthorizedException(data)).toThrow(
      UnauthorizedException,
    )
  })

  it('should throw NotFoundException', () => {
    const data = { type: 'NotFound', message: 'Not Found' }
    expect(() => service.notFoundException(data)).toThrow(NotFoundException)
  })
})
