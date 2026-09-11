import { Inject, Injectable } from '@nestjs/common'

import { IBookIdInput } from '@domain/entities/book.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class DeleteBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(params: IBookIdInput): Promise<boolean> {
    const existing = await this.bookRepository.findBookById(params.id)

    if (!existing) {
      throw this.exceptionsService.notFoundException({
        type: 'BookNotFoundException',
        message: 'Book not found',
      })
    }

    const deleted = await this.bookRepository.deleteBook(params)
    if (deleted) {
      await this.redisService.delPattern('books:*')
    }

    return deleted
  }
}

