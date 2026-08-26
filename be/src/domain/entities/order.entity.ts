import { AppointmentEntity } from './appointment.entity'
import { PaymentEntity } from './payment.entity'

export enum OrderStatusEnum {
  Pending = 1,
  Completed = 2,
  Failed = 3,
  Refunded = 4,
  RefundPending = 5,
}

export class OrderEntity {
  public readonly id!: number
  public userId!: number
  public appointmentId!: number
  public totalAmount!: number
  public currency!: string
  public status!: OrderStatusEnum
  public note?: string
  public providerId?: number
  public payments?: PaymentEntity[]
  public appointment?: AppointmentEntity
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}
