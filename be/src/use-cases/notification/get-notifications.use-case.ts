import { Inject, Injectable } from '@nestjs/common'

import { In } from 'typeorm'

import { NotificationEntity } from '@domain/entities/notification.entity'
import {
  INotificationRepositoryInterface,
  NOTIFICATION_REPOSITORY,
} from '@domain/repositories/notification.repository.interface'

import { GetListNotificationDto } from '@adapters/controllers/notification/dto/get-list-notification.dto'

export interface IGetNotificationsRequest {
  userId: number
  page?: number
  limit?: number
}

export interface IGetNotificationsResponse {
  notifications: NotificationEntity[]
  total: number
}

@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepositoryInterface,
  ) {}

  async execute(request: GetListNotificationDto) {
    return this.notificationRepository.findNotificationsByUserId(request)
  }
}
