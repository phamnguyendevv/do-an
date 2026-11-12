import { BookEntity, ISearchBooksInput } from '@domain/entities/book.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export type ISearchBooksParams = ISearchBooksInput

export const BOOK_REPOSITORY = 'BOOK_REPOSITORY_INTERFACE'

export interface IBookRepositoryInterface {
  findBooks(queryParams: ISearchBooksParams): Promise<{
    data: BookEntity[]
    pagination: IPaginationParams
  }>
  createBook(book: Partial<BookEntity>): Promise<BookEntity>
  updateBook(
    params: {
      id: number
    },
    book: Partial<BookEntity>,
  ): Promise<boolean>
  deleteBook(params: { id: number }): Promise<boolean>
  findBookById(id: number): Promise<BookEntity | null>
}
