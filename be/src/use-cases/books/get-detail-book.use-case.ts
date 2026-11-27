import { Inject, Injectable } from '@nestjs/common'

import { BookEntity, IBookIdInput } from '@domain/entities/book.entity'
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
export class GetDetailBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(params: IBookIdInput): Promise<BookEntity> {
    const cacheKey = `books:detail:${params.id}`

    const cached = await this.redisService.getValue<BookEntity>(cacheKey)
    if (cached) {
      return cached
    }

    const book = await this.bookRepository.findBookById(params.id)

    if (!book) {
      throw this.exceptionsService.notFoundException({
        type: 'BookNotFoundException',
        message: 'Book not found',
      })
    }

    await this.redisService.setValue(cacheKey, book, 300)

    return book
  }
}
