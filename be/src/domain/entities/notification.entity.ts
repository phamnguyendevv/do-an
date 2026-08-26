import { UserEntity } from './user.entity'

export enum NotificationTypeEnum {
  AppointmentCreated = 1,
  AppointmentConfirmed = 2,
  AppointmentCancelled = 3,
  AppointmentCompleted = 4,
  PaymentReceived = 5,
  ReviewReceived = 6,
  SystemNotification = 7,
  ProviderRegistered = 8,
}

export class NotificationEntity {
  public readonly id!: number
  public senderId?: number
  public receiverId!: number
  public type!: NotificationTypeEnum
  public title!: string
  public message!: string
  public data?: object
  public isRead!: boolean
  public readAt?: Date
  public sender?: UserEntity
  public receiver?: UserEntity
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
