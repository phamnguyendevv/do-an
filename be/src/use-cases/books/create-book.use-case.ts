import { Inject, Injectable } from '@nestjs/common'

import { BookEntity } from '@domain/entities/book.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'

@Injectable()
export class CreateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(book: Partial<BookEntity>): Promise<BookEntity> {
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

    return await this.bookRepository.createBook(normalized)
  }

  private resolveStatus(stock: number, minStock: number): string {
    if (stock === 0) return 'OUT_OF_STOCK'
    if (stock <= minStock) return 'LOW_STOCK'
    return 'IN_STOCK'
  }
}
