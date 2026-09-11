import { BookStatusEnum } from './order-enums.entity'

export class BookEntity {
  public readonly id!: number
  public title!: string
  public author!: string
  public category!: string
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
  category: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  minStock?: number
}

export interface IUpdateBookInput {
  title?: string
  author?: string
  category?: string
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
