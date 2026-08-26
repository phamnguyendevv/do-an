import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { CategoryEntity } from '@domain/entities/category.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  ICategoryRepositoryInterface,
  ISearchCategoryParams,
} from '@domain/repositories/category.repository.interface'

import { Category } from '../entities/category.entity'

const DEFAULT_SELECT_FIELDS: (keyof Category)[] = ['id', 'name', 'description']
@Injectable()
export class CategoryRepository implements ICategoryRepositoryInterface {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}
  async findCategories({ search, size, page }: ISearchCategoryParams): Promise<{
    data: CategoryEntity[]
    pagination: IPaginationParams
  }> {
    size = size || 100
    page = page || 1
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.isDeleted = false')
      .take(size)
      .skip((page - 1) * size)
    if (search) {
      query.andWhere('category.name ILIKE :name', { name: `%${search}%` })
    }
    query.andWhere('category.isDeleted = :isDeleted', {
      isDeleted: false,
    })
    const [data, total] = await query.getManyAndCount()
    const pagination: IPaginationParams = {
      total,
      page,
      size,
    }
    return { data, pagination }
  }
  async createCategory(category: Partial<Category>): Promise<Category> {
    const newCategory = this.categoryRepository.create(category)
    await this.categoryRepository.save(newCategory)
    return newCategory
  }
  async updateCategory(
    params: {
      id: number
    },
    category: Partial<CategoryEntity>,
  ): Promise<boolean> {
    const updateCategory = await this.categoryRepository.update(
      { id: params.id },
      category,
    )
    if (updateCategory.affected === 0) return false
    return true
  }

  async deleteCategory(params: { id: number }): Promise<boolean> {
    try {
      const deleteCategory = await this.categoryRepository.update(
        {
          id: params.id,
        },
        { isDeleted: true },
      )
      if (deleteCategory.affected === 0) return false
      return true
    } catch {
      return false
    }
  }
  async findCategoriesById(id: number): Promise<CategoryEntity | null> {
    const category = await this.categoryRepository.findOne({
      where: { id, isDeleted: false },
      select: DEFAULT_SELECT_FIELDS,
    })
    return category ? category : null
  }
}
