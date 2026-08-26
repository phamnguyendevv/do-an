import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'

@Injectable()
export class DeleteBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<boolean> {
    const existing = await this.bookRepository.findBookById(params.id)

    if (!existing) {
      throw this.exceptionsService.notFoundException({
        type: 'BookNotFoundException',
        message: 'Book not found',
      })
    }

    return await this.bookRepository.deleteBook(params)
  }
}
