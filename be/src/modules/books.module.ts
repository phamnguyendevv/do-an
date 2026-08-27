import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { BOOK_REPOSITORY } from '@domain/repositories/book.repository.interface'

import { BooksController } from '@adapters/controllers/books/books.controller'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { BookRepository } from '@infrastructure/databases/postgresql/repositories/book.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

import { CreateBookUseCase } from '@use-cases/books/create-book.use-case'
import { DeleteBookUseCase } from '@use-cases/books/delete-book.use-case'
import { GetDetailBookUseCase } from '@use-cases/books/get-detail-book.use-case'
import { GetListBooksUseCase } from '@use-cases/books/get-list-books.use-case'
import { UpdateBookUseCase } from '@use-cases/books/update-book.use-case'

@Module({
  imports: [TypeOrmModule.forFeature([Book]), CaslModule, ExceptionsModule],
  controllers: [BooksController],
  providers: [
    {
      provide: BOOK_REPOSITORY,
      useClass: BookRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    GetListBooksUseCase,
    CreateBookUseCase,
    UpdateBookUseCase,
    DeleteBookUseCase,
    GetDetailBookUseCase,
  ],
  exports: [BOOK_REPOSITORY],
})
export class BooksModule {}
