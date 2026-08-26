import { Inject, Injectable } from '@nestjs/common'

import { CategoryEntity } from '@domain/entities/category.entity'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
} from '@domain/repositories/category.repository.interface'

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,
  ) {}

  async execute(queryParams: Partial<CategoryEntity>): Promise<CategoryEntity> {
    const category = await this.categoryRepository.createCategory(queryParams)

    return category
  }
}
