import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CreateBookUseCase } from '@use-cases/books/create-book.use-case'
import { DeleteBookUseCase } from '@use-cases/books/delete-book.use-case'
import { GetDetailBookUseCase } from '@use-cases/books/get-detail-book.use-case'
import { GetListBooksUseCase } from '@use-cases/books/get-list-books.use-case'
import { UpdateBookUseCase } from '@use-cases/books/update-book.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateBookDto } from './dto/create-book.dto'
import { GetListBooksDto } from './dto/get-list-books.dto'
import { UpdateBookDto } from './dto/update-book.dto'

@Controller()
@ApiTags('Books')
@ApiResponse({ status: 401, description: 'No authorization token was found' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiResponse({ status: 500, description: 'Internal error' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BooksController {
  constructor(
    private readonly getListBooksUseCase: GetListBooksUseCase,
    private readonly createBookUseCase: CreateBookUseCase,
    private readonly getDetailBookUseCase: GetDetailBookUseCase,
    private readonly updateBookUseCase: UpdateBookUseCase,
    private readonly deleteBookUseCase: DeleteBookUseCase,
  ) {}

  @Get('/admin/books')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List books',
    description: 'Admin can list all books',
  })
  @CheckPolicies({ action: 'read', subject: 'Book' })
  async getBooks(@Query() queryParams: GetListBooksDto) {
    return await this.getListBooksUseCase.execute(queryParams)
  }

  @Get('/admin/books/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get book by ID',
    description: 'Admin can read a single book',
  })
  @CheckPolicies({ action: 'read', subject: 'Book' })
  async getBookById(@Param('id', ParseIntPipe) id: number) {
    return await this.getDetailBookUseCase.execute({ id })
  }

  @Post('/admin/books')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create book', description: 'Admin create book' })
  @CheckPolicies({ action: 'create', subject: 'Book' })
  async createBook(@Body() book: CreateBookDto) {
    return await this.createBookUseCase.execute(book)
  }

  @Put('/admin/books/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update book', description: 'Admin update book' })
  @CheckPolicies({ action: 'update', subject: 'Book' })
  async updateBook(
    @Param('id', ParseIntPipe) id: number,
    @Body() book: UpdateBookDto,
  ) {
    return await this.updateBookUseCase.execute({ id }, book)
  }

  @Delete('/admin/books/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete book', description: 'Admin delete book' })
  @CheckPolicies({ action: 'delete', subject: 'Book' })
  async deleteBook(@Param('id', ParseIntPipe) id: number) {
    return await this.deleteBookUseCase.execute({ id })
  }
}
