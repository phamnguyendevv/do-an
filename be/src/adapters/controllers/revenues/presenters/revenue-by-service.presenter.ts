import { ApiProperty } from '@nestjs/swagger'

import { OrderEntity } from '@domain/entities/order.entity'

export class RevenueByServicePresenter {
  @ApiProperty({ example: 1, description: 'Service ID' })
  serviceId: number

  @ApiProperty({ example: 'Service name', description: 'Service name' })
  serviceName: string

  @ApiProperty({ example: 1000, description: 'Total revenue' })
  totalRevenue: number

  @ApiProperty({ example: 10, description: 'Total orders' })
  totalOrders: number

  @ApiProperty({ example: 100, description: 'Average order value' })
  averageOrderValue: number

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency: string

  constructor(orders: OrderEntity[]) {
    this.totalRevenue = orders.reduce((total, order) => {
      return total + Number(order.totalAmount)
    }, 0)

    this.totalOrders = orders.length
    this.averageOrderValue = this.totalRevenue / this.totalOrders

    const firstOrder = orders[0]
    const service = firstOrder.appointment?.service

    if (!service) {
      throw new Error('Orders must have associated service information')
    }

    this.serviceId = service.id
    this.serviceName = service.name
    this.currency = firstOrder.currency || 'USD'
  }

  static getTopServices(
    orders: OrderEntity[],
    limit: number = 6,
  ): RevenueByServicePresenter[] {
    if (orders.length === 0) {
      return []
    }

    const groupedOrders = orders.reduce(
      (acc, order) => {
        const serviceId = order.appointment?.service?.id

        if (serviceId) {
          if (!acc[serviceId]) {
            acc[serviceId] = []
          }
          acc[serviceId].push(order)
        }

        return acc
      },
      {} as Record<number, OrderEntity[]>,
    )

    const presenters = Object.values(groupedOrders)
      .map((serviceOrders) => {
        try {
          return new RevenueByServicePresenter(serviceOrders)
        } catch {
          return null
        }
      })
      .filter(
        (presenter): presenter is RevenueByServicePresenter =>
          presenter !== null,
      )

    return presenters
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  }

  getFormattedRevenue(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.totalRevenue)
  }

  getFormattedAverageOrderValue(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.averageOrderValue)
  }
}
