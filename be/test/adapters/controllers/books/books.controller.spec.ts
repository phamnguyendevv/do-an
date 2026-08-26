import { Test, TestingModule } from '@nestjs/testing'

import { CreateBookUseCase } from '@use-cases/books/create-book.use-case'
import { DeleteBookUseCase } from '@use-cases/books/delete-book.use-case'
import { GetDetailBookUseCase } from '@use-cases/books/get-detail-book.use-case'
import { GetListBooksUseCase } from '@use-cases/books/get-list-books.use-case'
import { UpdateBookUseCase } from '@use-cases/books/update-book.use-case'

import { BooksController } from '@adapters/controllers/books/books.controller'
import { CreateBookDto } from '@adapters/controllers/books/dto/create-book.dto'
import { GetListBooksDto } from '@adapters/controllers/books/dto/get-list-books.dto'
import { UpdateBookDto } from '@adapters/controllers/books/dto/update-book.dto'

describe('BooksController', () => {
  let controller: BooksController
  let getListBooksUseCase: GetListBooksUseCase
  let createBookUseCase: CreateBookUseCase
  let getDetailBookUseCase: GetDetailBookUseCase
  let updateBookUseCase: UpdateBookUseCase
  let deleteBookUseCase: DeleteBookUseCase

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: GetListBooksUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateBookUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetDetailBookUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateBookUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteBookUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<BooksController>(BooksController)
    getListBooksUseCase = module.get<GetListBooksUseCase>(GetListBooksUseCase)
    createBookUseCase = module.get<CreateBookUseCase>(CreateBookUseCase)
    getDetailBookUseCase = module.get<GetDetailBookUseCase>(GetDetailBookUseCase)
    updateBookUseCase = module.get<UpdateBookUseCase>(UpdateBookUseCase)
    deleteBookUseCase = module.get<DeleteBookUseCase>(DeleteBookUseCase)
  })

  it('should list books', async () => {
    const query: GetListBooksDto = { page: 1, size: 10, search: 'Clean' }
    const response = { data: [{ id: 1, title: 'Clean Code' }], pagination: { total: 1, page: 1, size: 10 } }

    jest.spyOn(getListBooksUseCase, 'execute').mockResolvedValue(response)

    await expect(controller.getBooks(query)).resolves.toEqual(response)
    expect(getListBooksUseCase.execute).toHaveBeenCalledWith(query)
  })

  it('should create a book', async () => {
    const dto: CreateBookDto = {
      isbn: '978-1-234',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      publisher: 'Alpha Books',
      category: 'Công nghệ',
      purchasePrice: 210000,
      sellingPrice: 349000,
      stock: 64,
      minStock: 20,
    }
    const created = { id: 1, ...dto }

    jest.spyOn(createBookUseCase, 'execute').mockResolvedValue(created)

    await expect(controller.createBook(dto)).resolves.toEqual(created)
    expect(createBookUseCase.execute).toHaveBeenCalledWith(dto)
  })

  it('should get a book by id', async () => {
    const book = { id: 1, title: 'Clean Code' }
    jest.spyOn(getDetailBookUseCase, 'execute').mockResolvedValue(book)

    await expect(controller.getBookById(1)).resolves.toEqual(book)
    expect(getDetailBookUseCase.execute).toHaveBeenCalledWith({ id: 1 })
  })

  it('should update a book', async () => {
    const dto: UpdateBookDto = { title: 'Updated title' }
    jest.spyOn(updateBookUseCase, 'execute').mockResolvedValue(true)

    await expect(controller.updateBook(1, dto)).resolves.toBe(true)
    expect(updateBookUseCase.execute).toHaveBeenCalledWith({ id: 1 }, dto)
  })

  it('should delete a book', async () => {
    jest.spyOn(deleteBookUseCase, 'execute').mockResolvedValue(true)

    await expect(controller.deleteBook(1)).resolves.toBe(true)
    expect(deleteBookUseCase.execute).toHaveBeenCalledWith({ id: 1 })
  })
})
