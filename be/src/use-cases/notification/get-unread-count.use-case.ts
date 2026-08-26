import { Inject, Injectable } from '@nestjs/common'

import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'

export interface GetUnreadCountRequest {
  userId: number
}

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,
  ) {}

  async execute(request: GetUnreadCountRequest): Promise<number> {
    return this.notificationRepository.getNotificationUnreadCount(
      request.userId,
    )
  }
}
