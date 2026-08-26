import { AppointmentEntity } from './appointment.entity'
import { CategoryEntity } from './category.entity'
import { OrderEntity } from './order.entity'
import { PaymentEntity } from './payment.entity'
import { PromotionEntity } from './promotion.entity'
import { ServiceEntity } from './service.entity'
import { UserEntity, UserWithProfileEntity } from './user.entity'

export enum InvoiceStatusEnum {
  Draft = 1,
  Sent = 2,
  Paid = 3,
  Overdue = 4,
  Cancelled = 5,
  Refunded = 6,
}

export class InvoiceEntity {
  public readonly id!: number
  public invoiceNumber!: string
  public appointmentId!: number
  public orderId!: number
  public providerId!: number
  public clientId!: number
  public issueDate!: Date
  public dueDate!: Date
  public subtotal!: number
  public discountAmount!: number
  public taxAmount!: number
  public totalAmount!: number
  public currency!: string
  public status!: InvoiceStatusEnum
  public notes?: string
  public paymentTerms?: string
  public isDeleted!: boolean

  // Relations
  public appointment?: AppointmentEntity
  public order?: OrderEntity
  public provider?: UserWithProfileEntity
  public client?: UserEntity
  public service?: ServiceEntity
  public category?: CategoryEntity
  public promotion?: PromotionEntity
  public payments?: PaymentEntity[]

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}
