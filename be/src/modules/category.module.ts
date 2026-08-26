import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { CATEGORY_REPOSITORY } from '@domain/repositories/category.repository.interface'

import { CreateCategoryUseCase } from '@use-cases/categories/create-category.use-case'
import { DeleteCategoryUseCase } from '@use-cases/categories/delete-category.use.case'
import { GetDetailCategoryUseCase } from '@use-cases/categories/get-detail-category.use-case'
import { GetListCategoryUseCase } from '@use-cases/categories/get-list-category.use-case'
import { UpdateCategoryUseCase } from '@use-cases/categories/update-category.use-case'

import { CategoriesController } from '@adapters/controllers/categories/categories.controller'

import { Category } from '@infrastructure/databases/postgressql/entities/category.entity'
import { CategoryRepository } from '@infrastructure/databases/postgressql/repositories/category.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

@Module({
  imports: [TypeOrmModule.forFeature([Category]), CaslModule, ExceptionsModule],

  controllers: [CategoriesController],
  providers: [
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    GetListCategoryUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    GetDetailCategoryUseCase,
  ],
  exports: [CATEGORY_REPOSITORY], 
})
export class CategoriesModule {}
