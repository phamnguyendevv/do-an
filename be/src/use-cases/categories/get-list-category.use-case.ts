import { Inject, Injectable } from '@nestjs/common'

import { CategoryEntity } from '@domain/entities/category.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  CATEGORY_REPOSITORY,
  ICategoryRepositoryInterface,
  ISearchCategoryParams,
} from '@domain/repositories/category.repository.interface'

@Injectable()
export class GetListCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepositoryInterface,
  ) {}

  async execute(queryParams: ISearchCategoryParams): Promise<{
    data: CategoryEntity[]
    pagination: IPaginationParams
  }> {
    return await this.categoryRepository.findCategories(queryParams)
  }
}
