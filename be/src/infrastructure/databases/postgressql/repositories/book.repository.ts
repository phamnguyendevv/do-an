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
  'category',
  'purchasePrice',
  'sellingPrice',
  'stock',
  'minStock',
  'status',
  'createdAt',
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
  }: ISearchBooksParams): Promise<{
    data: BookEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 100
    const currentPage = page || 1

    const query = this.bookRepository
      .createQueryBuilder('book')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('book.createdAt', 'DESC')

    if (search) {
      query.andWhere(
        '(book.title ILIKE :search OR book.author ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (category) {
      query.andWhere('book.category = :category', { category })
    }

    if (status) {
      query.andWhere('book.status = :status', { status })
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
