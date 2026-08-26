import { Inject, Injectable } from '@nestjs/common'

import { BookEntity } from '@domain/entities/book.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
  ISearchBooksParams,
} from '@domain/repositories/book.repository.interface'

@Injectable()
export class GetListBooksUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchBooksParams,
  ): Promise<{ data: BookEntity[]; pagination: IPaginationParams }> {
    return await this.bookRepository.findBooks(queryParams)
  }
}
