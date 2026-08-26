import { CategoryEntity } from '@domain/entities/category.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchCategoryParams {
  size?: number
  search?: string
  page?: number
}

export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY_INTERFACE'

export interface ICategoryRepositoryInterface {
  findCategories(queryParams: ISearchCategoryParams): Promise<{
    data: CategoryEntity[]
    pagination: IPaginationParams
  }>
  createCategory(category: Partial<CategoryEntity>): Promise<CategoryEntity>
  updateCategory(
    params: {
      id: number
    },
    category: Partial<CategoryEntity>,
  ): Promise<boolean>
  deleteCategory(params: { id: number }): Promise<boolean>
  findCategoriesById(id: number): Promise<CategoryEntity | null>
}
