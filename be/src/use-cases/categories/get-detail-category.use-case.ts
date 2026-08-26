import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
} from '@domain/repositories/category.repository.interface'

@Injectable()
export class GetDetailCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: { id: number }) {
    const categories = await this.categoryRepository.findCategoriesById(
      payload.id,
    )

    if (!categories) {
      throw this.exceptionsService.notFoundException({
        type: 'CategoriesNotFoundException',
        message: 'Categories not found',
      })
    }

    return categories
  }
}
