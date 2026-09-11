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

export interface CreateOrderItemInput {
  bookId: number | string
  title: string
  quantity: number
  price: number
}

export interface CreateOrderInput {
  customerId?: number
  orderCode?: string
  customerName: string
  customerPhone: string
  customerAddress: string
  provinceId?: number
  districtId?: number
  wardCode?: string
  items: CreateOrderItemInput[]
  shippingFee?: number
  discount?: number
  promotionCode?: string
  shippingMethod?: string
  trackingCode?: string
  note?: string
  status?: string
  payment?: string
  actor?: string
  actorRole?: string
}

export interface UpdateOrderInput {
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  provinceId?: number
  districtId?: number
  wardCode?: string
  shippingFee?: number
  discount?: number
  note?: string
  status?: string
  payment?: string
}

export interface ISePayWebhookInput {
  id?: number
  gateway?: string
  transactionDate?: string
  accountNumber?: string
  subAccount?: string | null
  transferType?: string
  transferAmount?: number
  accumulated?: number
  code?: string | null
  content?: string
  referenceCode?: string
  description?: string
}

