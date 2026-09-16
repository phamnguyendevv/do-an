import { Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'

@Injectable()
export class GetDailyRevenueUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(params?: {
    startDate?: string | Date
    endDate?: string | Date
    days?: number
  }) {
    const orderRepo = this.dataSource.getRepository(BookstoreOrder)

    const now = new Date()
    const daysLimit = params?.days || 30
    const start = params?.startDate
      ? new Date(params.startDate)
      : new Date(now.getTime() - daysLimit * 86400000)
    const end = params?.endDate ? new Date(params.endDate) : now

    const orders = await orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :start', { start })
      .andWhere('o.createdAt <= :end', { end })
      .andWhere("o.status != 'CANCELLED'")
      .orderBy('o.createdAt', 'ASC')
      .getMany()

    const dailyMap = new Map<
      string,
      { date: string; revenue: number; orders: number; books: number }
    >()

    for (const order of orders) {
      const d = new Date(order.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { date: key, revenue: 0, orders: 0, books: 0 })
      }
      const entry = dailyMap.get(key)!
      entry.orders += 1
      entry.revenue += Number(order.total || 0)
      if (order.items && Array.isArray(order.items)) {
        for (const it of order.items) {
          entry.books += Number(it.quantity || 0)
        }
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    )
  }
}
