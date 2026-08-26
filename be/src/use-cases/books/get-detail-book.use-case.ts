import { Inject, Injectable } from '@nestjs/common'

import { BookEntity } from '@domain/entities/book.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'

@Injectable()
export class GetDetailBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<BookEntity> {
    const book = await this.bookRepository.findBookById(params.id)

    if (!book) {
      throw this.exceptionsService.notFoundException({
        type: 'BookNotFoundException',
        message: 'Book not found',
      })
    }

    return book
  }
}
