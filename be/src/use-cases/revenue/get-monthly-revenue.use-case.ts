import { Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'

@Injectable()
export class GetMonthlyRevenueUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(params?: { months?: number }) {
    const orderRepo = this.dataSource.getRepository(BookstoreOrder)
    const limitMonths = params?.months || 6

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - limitMonths + 1)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const orders = await orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :startDate', { startDate })
      .andWhere("o.status != 'CANCELLED'")
      .orderBy('o.createdAt', 'ASC')
      .getMany()

    // Map by YYYY-MM
    const monthlyMap = new Map<
      string,
      { month: string; revenue: number; orders: number; books: number }
    >()

    for (let i = 0; i < limitMonths; i++) {
      const d = new Date(startDate)
      d.setMonth(startDate.getMonth() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `T${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
      monthlyMap.set(key, { month: label, revenue: 0, orders: 0, books: 0 })
    }

    for (const order of orders) {
      const d = new Date(order.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (entry) {
        entry.orders += 1
        entry.revenue += Number(order.total || 0)
        if (order.items && Array.isArray(order.items)) {
          for (const it of order.items) {
            entry.books += Number(it.quantity || 0)
          }
        }
      }
    }

    return Array.from(monthlyMap.values())
  }
}
