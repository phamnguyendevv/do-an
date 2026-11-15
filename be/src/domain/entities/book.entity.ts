import { BookStatusEnum } from './order-enums.entity'

export class BookEntity {
  public readonly id!: number
  public title!: string
  public author!: string
  /** Tên thể loại (string, backward compat) */
  public category!: string
  /** FK tới categories(id) — nullable */
  public categoryId?: number
  public purchasePrice!: number
  public sellingPrice!: number
  public stock!: number
  public minStock!: number
  public status!: BookStatusEnum | string
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}

export interface ICreateBookInput {
  title: string
  author: string
  /** Tên thể loại (string) */
  category: string
  /** FK tới categories(id) — optional */
  categoryId?: number
  purchasePrice: number
  sellingPrice: number
  stock: number
  minStock?: number
}

export interface IUpdateBookInput {
  title?: string
  author?: string
  category?: string
  categoryId?: number
  purchasePrice?: number
  sellingPrice?: number
  stock?: number
  minStock?: number
  status?: BookStatusEnum | string
}

export interface ISearchBooksInput {
  size?: number
  search?: string
  page?: number
  category?: string
  categoryId?: number
  status?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface IBookIdInput {
  id: number
}
