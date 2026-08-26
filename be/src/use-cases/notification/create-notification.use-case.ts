import { Inject, Injectable } from '@nestjs/common'

import {
  NotificationEntity,
  NotificationTypeEnum,
} from '@domain/entities/notification.entity'
import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'
import {
  INotificationService,
  NOTIFICATION_SERVICE,
} from '@domain/services/notification.interface'

export interface ICreateNotificationRequest {
  senderId?: number
  receiverId: number
  title: string
  message: string
  type: NotificationTypeEnum
  data?: object
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,

    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
  ) {}

  async execute(
    request: ICreateNotificationRequest,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.createNotification({
      senderId: request.senderId,
      receiverId: request.receiverId,
      title: request.title,
      message: request.message,
      type: request.type,
      data: request.data,
      isRead: false,
    })

    await this.notificationService.sendNotificationToUser(
      request.receiverId,
      notification,
    )
    return notification
  }
}
