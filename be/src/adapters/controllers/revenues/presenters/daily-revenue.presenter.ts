import { OrderEntity } from "@domain/entities/order.entity"
import { ApiProperty } from "@nestjs/swagger"
import { DailyRevenueDto } from "../dto/daily-revenue.dto"

export class DailyRevenuePresenter {
  @ApiProperty({ example: '2024-08-01', description: 'Date' })
  date!: string

  @ApiProperty({ example: '1000', description: 'Total revenue' })
  totalRevenue!: number

  @ApiProperty({ example: '100', description: 'Total orders' })
  totalOrders!: number

  @ApiProperty({ example: '10', description: 'Total refunds' })
  totalRefunds!: number

  @ApiProperty({ example: '900', description: 'Net revenue' })
  netRevenue!: number

  @ApiProperty({ example: 'usd', description: 'Currency' })
  currency!: string

  constructor (orders: OrderEntity[] , filter : DailyRevenueDto) {
    this.totalRevenue = orders.reduce((total, order) => {
      return total + parseFloat(order.totalAmount.toString())
    }, 0)

    this.totalOrders = orders.length

    this.totalRefunds = orders.reduce((total, order) => {
      if (order.payments && order.payments.length > 0) {
        return total + order.payments.reduce((paymentTotal, payment) => {
          return paymentTotal + parseFloat(payment.refundAmount?.toString() || '0')
        }, 0)
      } 
      return total
    }, 0)
    
    this.netRevenue = this.totalRevenue - this.totalRefunds
    

    this.currency = orders.length > 0 ? orders[0].currency : 'usd'
    
    this.date = filter.date

    
  }
}
