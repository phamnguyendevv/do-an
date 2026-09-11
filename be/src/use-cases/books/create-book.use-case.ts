import { Inject, Injectable } from '@nestjs/common'

import { BookEntity, ICreateBookInput } from '@domain/entities/book.entity'
import { BookStatusEnum } from '@domain/entities/order-enums.entity'
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
export class CreateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(book: ICreateBookInput): Promise<BookEntity> {
    const normalized = {
      ...book,
      status: this.resolveStatus(book.stock ?? 0, book.minStock ?? 0),
    }

    if (!normalized.title || !normalized.author) {
      throw this.exceptionsService.badRequestException({
        type: 'BookValidationException',
        message: 'Title and author are required',
      })
    }

    const created = await this.bookRepository.createBook(normalized)
    await this.redisService.delPattern('books:*')

    return created
  }

  private resolveStatus(stock: number, minStock: number): BookStatusEnum {
    if (stock === 0) return BookStatusEnum.OutOfStock
    if (stock <= minStock) return BookStatusEnum.LowStock
    return BookStatusEnum.InStock
  }
}

