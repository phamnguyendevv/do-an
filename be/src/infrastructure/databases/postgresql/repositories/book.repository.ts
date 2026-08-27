import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { BookEntity } from '@domain/entities/book.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IBookRepositoryInterface,
  ISearchBooksParams,
} from '@domain/repositories/book.repository.interface'

import { Book } from '../entities/book.entity'

const DEFAULT_SELECT_FIELDS: (keyof Book)[] = [
  'id',
  'title',
  'author',
  'publisher',
  'isbn',
  'category',
  'purchasePrice',
  'sellingPrice',
  'stock',
  'minStock',
  'status',
  'createdAt',
  'updatedAt',
]

@Injectable()
export class BookRepository implements IBookRepositoryInterface {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  async findBooks({
    search,
    size,
    page,
    category,
    status,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  }: ISearchBooksParams): Promise<{
    data: BookEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 100
    const currentPage = page || 1

    // Determine sort column — whitelist to prevent SQL injection
    const ALLOWED_SORT_FIELDS: Record<string, string> = {
      createdAt: 'book.createdAt',
      updatedAt: 'book.updatedAt',
      title: 'book.title',
      sellingPrice: 'book.sellingPrice',
      purchasePrice: 'book.purchasePrice',
      stock: 'book.stock',
    }
    const sortCol = ALLOWED_SORT_FIELDS[sortBy ?? ''] ?? 'book.createdAt'
    const sortDir: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC'

    const query = this.bookRepository
      .createQueryBuilder('book')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy(sortCol, sortDir)

    if (search) {
      query.andWhere(
        '(book.title ILIKE :search OR book.author ILIKE :search OR book.isbn ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (category) {
      query.andWhere('book.category = :category', { category })
    }

    if (status) {
      query.andWhere('book.status = :status', { status })
    }

    if (minPrice !== undefined) {
      query.andWhere('book.sellingPrice >= :minPrice', { minPrice })
    }

    if (maxPrice !== undefined) {
      query.andWhere('book.sellingPrice <= :maxPrice', { maxPrice })
    }

    if (startDate) {
      query.andWhere('book.createdAt >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query.andWhere('book.createdAt <= :endDate', { endDate: end })
    }

    const [data, total] = await query.getManyAndCount()

    return {
      data,
      pagination: {
        total,
        page: currentPage,
        size: limit,
      },
    }
  }

  async createBook(book: Partial<BookEntity>): Promise<BookEntity> {
    const newBook = this.bookRepository.create(book)
    return await this.bookRepository.save(newBook)
  }

  async updateBook(
    params: { id: number },
    book: Partial<BookEntity>,
  ): Promise<boolean> {
    const result = await this.bookRepository.update({ id: params.id }, book)
    return result.affected !== 0
  }

  async deleteBook(params: { id: number }): Promise<boolean> {
    const result = await this.bookRepository.delete({ id: params.id })
    return result.affected !== 0
  }

  async findBookById(id: number): Promise<BookEntity | null> {
    const book = await this.bookRepository.findOne({
      where: { id },
      select: DEFAULT_SELECT_FIELDS,
    })

    return book ?? null
  }
}
