import { Inject, Injectable } from '@nestjs/common'

import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'

export interface MarkAllAsReadRequest {
  userId: number
}

@Injectable()
export class MarkAllAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,
  ) {}

  async execute(request: MarkAllAsReadRequest): Promise<void> {
    return this.notificationRepository.markAllNotificationAsRead(request.userId)
  }
}
