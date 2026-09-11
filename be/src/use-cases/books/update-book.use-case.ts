import { Inject, Injectable } from '@nestjs/common'

import {
  BookEntity,
  IBookIdInput,
  IUpdateBookInput,
} from '@domain/entities/book.entity'
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
export class UpdateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(
    params: IBookIdInput,
    book: IUpdateBookInput,
  ): Promise<boolean> {
    const existing = await this.bookRepository.findBookById(params.id)
    if (!existing) {
      throw this.exceptionsService.notFoundException({
        type: 'BookNotFoundException',
        message: 'Book not found',
      })
    }

    const normalized = {
      ...book,
      status: this.resolveStatus(
        book.stock ?? existing.stock,
        book.minStock ?? existing.minStock,
      ),
    }

    const updated = await this.bookRepository.updateBook(params, normalized)
    if (updated) {
      await this.redisService.delPattern('books:*')
    }

    return updated
  }

  private resolveStatus(stock: number, minStock: number): BookStatusEnum {
    if (stock === 0) return BookStatusEnum.OutOfStock
    if (stock <= minStock) return BookStatusEnum.LowStock
    return BookStatusEnum.InStock
  }
}

