import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'

@Injectable()
export class GetOverviewRevenueUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(params?: { startDate?: Date; endDate?: Date }) {
    const orderRepo = this.dataSource.getRepository(BookstoreOrder)

    const query = orderRepo.createQueryBuilder('o')

    if (params?.startDate) {
      query.andWhere('o.createdAt >= :startDate', { startDate: params.startDate })
    }

    if (params?.endDate) {
      query.andWhere('o.createdAt <= :endDate', { endDate: params.endDate })
    }

    const orders = await query.getMany()

    let totalRevenue = 0
    let pendingRevenue = 0
    let totalOrders = orders.length
    let deliveredOrders = 0
    let cancelledOrders = 0
    let totalBooksSold = 0

    for (const order of orders) {
      if (order.status === 'CANCELLED') {
        cancelledOrders++
        continue
      }

      if (order.status === 'DELIVERED') {
        deliveredOrders++
      }

      const totalVal = Number(order.total || 0)
      if (order.payment === 'PAID') {
        totalRevenue += totalVal
      } else {
        pendingRevenue += totalVal
      }

      if (order.items && Array.isArray(order.items)) {
        for (const it of order.items) {
          totalBooksSold += Number(it.quantity || 0)
        }
      }
    }

    return {
      totalRevenue,
      pendingRevenue,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalBooksSold,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / Math.max(1, totalOrders - cancelledOrders)) : 0,
    }
  }
}
