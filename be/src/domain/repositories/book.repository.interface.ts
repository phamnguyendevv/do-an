import { BookEntity } from '@domain/entities/book.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchBooksParams {
  size?: number
  search?: string
  page?: number
  category?: string
  status?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

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
