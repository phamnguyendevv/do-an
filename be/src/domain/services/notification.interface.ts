import { NotificationEntity } from '@domain/entities/notification.entity'

export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE_INTERFACE'

export interface INotificationService {
  sendNotificationToUser(
    userId: number,
    notification: NotificationEntity,
  ): Promise<void>
  // sendNotificationToUsers(
  //   userIds: number[],
  //   notification: NotificationEntity,
  // ): Promise<void>
  // broadcastNotification(notification: Omit<NotificationEntity, 'userId'>): void
}
