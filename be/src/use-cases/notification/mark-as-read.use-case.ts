import { Inject, Injectable } from '@nestjs/common'

import { NotificationEntity } from '@domain/entities/notification.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'

export interface MarkAsReadRequest {
  notificationId: number
  userId: number
}

@Injectable()
export class MarkAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(request: MarkAsReadRequest): Promise<NotificationEntity> {
    const notification =
      await this.notificationRepository.findNotificationByUserIdAndId(
        request.userId,
        request.notificationId,
      )

    if (!notification) {
      throw this.exceptionsService.notFoundException({
        type: 'NotificationNotFoundException',
        message: `Notification with ID ${request.notificationId} not found for user ${request.userId}`,
      })
    }

    return this.notificationRepository.markNotificationAsRead(
      request.notificationId,
      request.userId,
    )
  }
}
