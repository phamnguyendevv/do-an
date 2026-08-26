import { Inject, Injectable } from '@nestjs/common'

import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'

@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,
  ) {}

  async execute(request: {
    notificationId: number
    userId: number
  }): Promise<boolean> {
    return await this.notificationRepository.deleteNotification(
      request.notificationId,
      request.userId,
    )
  }
}
