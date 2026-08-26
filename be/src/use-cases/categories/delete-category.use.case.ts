import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
} from '@domain/repositories/category.repository.interface'

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<boolean> {
    await this.checkCategoryExistence(params)

    return await this.categoryRepository.deleteCategory(params)
  }

  private async checkCategoryExistence(params: { id: number }): Promise<void> {
    const categories = await this.categoryRepository.findCategoriesById(
      params.id,
    )
    if (!categories) {
      throw this.exceptionsService.notFoundException({
        type: 'CategoryNotFoundException',
        message: 'Category not found',
      })
    }
  }
}
