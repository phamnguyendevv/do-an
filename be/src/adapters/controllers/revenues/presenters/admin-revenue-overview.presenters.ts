import { ApiProperty } from '@nestjs/swagger'

import { OrderEntity } from '@domain/entities/order.entity'

import { MonthlyRevenuePresenter } from './monthly-revenue.presenter'

export class AdminRevenueOverviewPresenter {
  @ApiProperty({ example: '1000', description: 'Total revenue' })
  totalSystemRevenue!: number
  @ApiProperty({ example: '10', description: 'Total providers' })
  totalProviders!: number
  @ApiProperty({ example: '100', description: 'Top providers' })
  topProviders!: {
    providerId?: number
    providerName?: string
    revenue: number
  }[]
  @ApiProperty({ example: '900', description: 'Net revenue' })
  revenueByMonth!: MonthlyRevenuePresenter[]
  @ApiProperty({ example: 'usd', description: 'Currency' })
  currency!: string

  constructor(orders: OrderEntity[]) {
    this.totalSystemRevenue = orders.reduce((total, order) => {
      return total + parseFloat(order.totalAmount.toString())
    }, 0)
    this.totalProviders = orders.reduce((total, order) => {
      return order.appointment?.providerId ? total + 1 : total
    }, 0)
    // Lấy revenue tổng cho từng providerId, chỉ lấy 6 providerId khác nhau, sắp xếp giảm dần theo revenue
    const providerRevenueMap = new Map<
      number,
      { providerName?: string; revenue: number }
    >()
    orders.forEach((order) => {
      const providerId = order.appointment?.providerId
      if (!providerId) return
      const providerName = order.appointment?.provider?.username
      const revenue = parseFloat(order.totalAmount.toString())
      if (!providerRevenueMap.has(providerId)) {
        providerRevenueMap.set(providerId, { providerName, revenue })
      } else {
        const current = providerRevenueMap.get(providerId)!
        providerRevenueMap.set(providerId, {
          providerName: current.providerName,
          revenue: current.revenue + revenue,
        })
      }
    })
    this.topProviders = Array.from(providerRevenueMap.entries())
      .map(([providerId, data]) => ({
        providerId,
        providerName: data.providerName,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
    this.revenueByMonth = this.groupRevenueByMonth(orders)
  }
  private groupRevenueByMonth(
    orders: OrderEntity[],
  ): MonthlyRevenuePresenter[] {
    const now = new Date()
    const year = now.getFullYear()
    const months: MonthlyRevenuePresenter[] = []
    for (let m = 0; m < 12; m++) {
      const ordersInMonth = orders.filter((order) => {
        if (!order.payments || order.payments.length === 0) return false

        const paymentDate = order.payments[0].paymentDate
          ? new Date(order.payments[0].paymentDate)
          : null
        return (
          paymentDate &&
          paymentDate.getFullYear() === year &&
          paymentDate.getMonth() === m
        )
      })
      const totalRevenue = ordersInMonth.reduce(
        (total, order) => total + parseFloat(order.totalAmount.toString()),
        0,
      )
      const totalOrders = ordersInMonth.length
      const totalRefunds = ordersInMonth.reduce((total, order) => {
        if (order.payments && order.payments.length > 0) {
          return (
            total +
            order.payments.reduce(
              (paymentTotal, payment) =>
                paymentTotal +
                parseFloat(payment.refundAmount?.toString() || '0'),
              0,
            )
          )
        }
        return total
      }, 0)
      const netRevenue = totalRevenue - totalRefunds
      const currency =
        ordersInMonth.length > 0
          ? ordersInMonth[0].currency
          : orders.length > 0
            ? orders[0].currency
            : 'usd'
      months.push({
        month: m + 1,
        year,
        totalRevenue,
        totalOrders,
        totalRefunds,
        netRevenue,
        currency,
      })
    }
    return months
  }
}
