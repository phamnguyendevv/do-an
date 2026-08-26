import { ApiProperty } from '@nestjs/swagger'

import { OrderEntity } from '@domain/entities/order.entity'

import { RevenueFilterDto } from '../dto/revenue-filter.dto'

export class RevenueOverviewPresenter {
  @ApiProperty({ example: '1000', description: 'Total revenue' })
  totalRevenue!: number
  @ApiProperty({ example: '10', description: 'Total orders' })
  totalOrders!: number
  @ApiProperty({ example: '100', description: 'Total refunds' })
  totalRefunds!: number
  @ApiProperty({ example: '900', description: 'Net revenue' })
  netRevenue!: number
  @ApiProperty({ example: 'usd', description: 'Currency' })
  currency!: string
  @ApiProperty({
    example: { startDate: '2025-01-01', endDate: '2025-11-01' },
    description: 'Period',
  })
  period!: {
    startDate?: Date
    endDate?: Date
  }

  constructor(orders: OrderEntity[]) {
    this.totalRevenue = orders.reduce((total, order) => {
      return total + parseFloat(order.totalAmount.toString())
    }, 0)

    this.totalOrders = orders.length

    this.totalRefunds = orders.reduce((total, order) => {
      if (order.payments && order.payments.length > 0) {
        return (
          total +
          order.payments.reduce((paymentTotal, payment) => {
            return (
              paymentTotal + parseFloat(payment.refundAmount?.toString() || '0')
            )
          }, 0)
        )
      }
      return total
    }, 0)

    this.netRevenue = this.totalRevenue - this.totalRefunds

    this.currency = orders.length > 0 ? orders[0].currency : 'usd'
    const allPaymentDates: Date[] = []

    orders.forEach((order) => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment) => {
          if (payment.paymentDate) {
            allPaymentDates.push(new Date(payment.paymentDate))
          }
        })
      }
    })

    this.period = {
      startDate:
        allPaymentDates.length > 0
          ? new Date(Math.min(...allPaymentDates.map((date) => date.getTime())))
          : new Date('2025-01-01'),
      endDate:
        allPaymentDates.length > 0
          ? new Date(Math.max(...allPaymentDates.map((date) => date.getTime())))
          : new Date('2025-11-01'),
    }
  }
}
