import {
  NotificationEntity,
  NotificationTypeEnum,
} from '@domain/entities/notification.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchNotificationParams {
  id?: number
  userId?: number
  type?: NotificationTypeEnum
  title?: string
  message?: string
  data?: any
  isRead?: boolean
  readAt?: Date
  createdAt?: Date
  updatedAt?: Date
  page?: number
  size?: number
}

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY_INTERFACE'

export interface INotificationRepositoryInterface {
  createNotification(
    notification: Partial<NotificationEntity>,
  ): Promise<NotificationEntity>
  findNotificationsByUserId(params: ISearchNotificationParams): Promise<{
    data: NotificationEntity[]
    pagination: IPaginationParams
  }>
  findNotificationById(id: number): Promise<NotificationEntity | null>
  findNotificationByUserIdAndId(
    userId: number,
    id: number,
  ): Promise<NotificationEntity | null>
  getNotificationUnreadCount(userId: number): Promise<number>
  markNotificationAsRead(
    id: number,
    userId: number,
  ): Promise<NotificationEntity>
  markAllNotificationAsRead(userId: number): Promise<void>
  deleteNotification(id: number, userId: number): Promise<boolean>
  // createBulkNotification(
  //   notifications: Omit<NotificationEntity, 'id' | 'createdAt' | 'updatedAt'>[],
  // ): Promise<NotificationEntity[]>
}
