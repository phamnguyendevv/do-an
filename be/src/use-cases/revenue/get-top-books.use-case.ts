import { Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'

@Injectable()
export class GetTopSellingBooksUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(params?: { limit?: number; startDate?: Date; endDate?: Date }) {
    const orderRepo = this.dataSource.getRepository(BookstoreOrder)
    const limit = params?.limit || 10

    const query = orderRepo
      .createQueryBuilder('o')
      .where("o.status != 'CANCELLED'")

    if (params?.startDate) {
      query.andWhere('o.createdAt >= :startDate', {
        startDate: params.startDate,
      })
    }

    if (params?.endDate) {
      query.andWhere('o.createdAt <= :endDate', { endDate: params.endDate })
    }

    const orders = await query.getMany()

    const bookMap = new Map<
      string,
      {
        bookId: string
        title: string
        soldQuantity: number
        totalRevenue: number
      }
    >()

    for (const order of orders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const key = String(item.bookId)
          if (!bookMap.has(key)) {
            bookMap.set(key, {
              bookId: key,
              title: item.title,
              soldQuantity: 0,
              totalRevenue: 0,
            })
          }
          const entry = bookMap.get(key)!
          entry.soldQuantity += Number(item.quantity || 0)
          entry.totalRevenue +=
            Number(item.quantity || 0) * Number(item.price || 0)
        }
      }
    }

    const sorted = Array.from(bookMap.values())
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, limit)

    return sorted
  }
}
