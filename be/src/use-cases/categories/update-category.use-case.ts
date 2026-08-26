import { Inject, Injectable } from '@nestjs/common'

import { CategoryEntity } from '@domain/entities/category.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
} from '@domain/repositories/category.repository.interface'

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number },
    updatedCategory: Partial<CategoryEntity>,
  ): Promise<boolean> {
    await this.checkCategoryExits(params)
    return await this.categoryRepository.updateCategory(params, updatedCategory)
  }
  private async checkCategoryExits(params: { id: number }) {
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
