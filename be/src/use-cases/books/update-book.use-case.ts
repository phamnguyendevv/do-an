import { Inject, Injectable } from '@nestjs/common'

import { BookEntity } from '@domain/entities/book.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'

@Injectable()
export class UpdateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number },
    book: Partial<BookEntity>,
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

    return await this.bookRepository.updateBook(params, normalized)
  }

  private resolveStatus(stock: number, minStock: number): string {
    if (stock === 0) return 'OUT_OF_STOCK'
    if (stock <= minStock) return 'LOW_STOCK'
    return 'IN_STOCK'
  }
}
