import { ServiceEntity } from './service.entity'
import { UserEntity, UserWithProfileEntity } from './user.entity'

export enum AppointmentStatusEnum {
  Pending = 1,
  Confirmed = 2,
  Completed = 3,
  Cancelled = 4,
}

export class AppointmentEntity {
  public readonly id!: number
  public providerId!: number
  public clientId!: number
  public serviceId!: number
  public notes!: string
  public status!: AppointmentStatusEnum
  public startTime!: Date
  public endTime!: Date
  public duration!: number
  public promotionId?: number
  public cancellationReason?: string
  public cancelledByUserId?: number
  public cancelledAt?: Date
  public totalAmount!: number
  public commissionAmount!: number
  public discountAmount!: number
  public finalAmount!: number
  public providerAmount!: number
  public reminderSentAt?: Date
  public reminderSent?: boolean
  public isDeleted!: boolean
  public service?: ServiceEntity
  public provider?: UserWithProfileEntity
  public client?: UserEntity
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
