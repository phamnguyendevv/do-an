import { OrderStatusEnum, PaymentStatusEnum } from './order-enums.entity'

export interface BookstoreOrderItemEntity {
  bookId: number | string
  title: string
  quantity: number
  price: number
}

export class BookstoreOrderEntity {
  public readonly id!: number
  public orderCode!: string
  public customerName!: string
  public customerPhone!: string
  public customerAddress!: string
  public provinceId?: number
  public districtId?: number
  public wardCode?: string
  public items!: BookstoreOrderItemEntity[]
  public subtotal!: number
  public discount!: number
  public shippingFee!: number
  public total!: number
  public payment!: PaymentStatusEnum | string
  public shippingMethod!: string
  public trackingCode?: string
  public status!: OrderStatusEnum | string
  public note?: string
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
