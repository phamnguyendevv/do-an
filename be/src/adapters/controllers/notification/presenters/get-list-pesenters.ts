import { ApiProperty } from '@nestjs/swagger'

import {
  NotificationEntity,
  NotificationTypeEnum,
} from '@domain/entities/notification.entity'

import { Pagination } from '@adapters/controllers/appointments/presenters/get-list-appointment.presenters'

export class NotificationPresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  title!: string

  @ApiProperty()
  message!: string

  @ApiProperty({ enum: NotificationTypeEnum })
  type!: NotificationTypeEnum

  @ApiProperty()
  isRead!: boolean

  @ApiProperty({
    default: {
      id: 0,
      username: '',
      avatarUrl: '',
    },
  })
  receiver?: {
    id: number
    username: string
    avatarUrl: string
  }

  @ApiProperty({
    default: {
      id: 0,
      username: '',
      avatarUrl: '',
    },
  })
  sender?: {
    id: number
    username: string
    avatarUrl: string
  }

  @ApiProperty()
  createdAt?: Date

  constructor(notification: NotificationEntity) {
    this.id = notification.id
    this.title = notification.title
    this.message = notification.message

    this.receiver = {
      id: notification.receiver?.id || 0,
      username: notification.receiver?.username || '',
      avatarUrl: notification.receiver?.avatarUrl || '',
    }

    this.sender = {
      id: notification.sender?.id || 0,
      username: notification.sender?.username || '',
      avatarUrl: notification.sender?.avatarUrl || '',
    }

    this.type = notification.type
    this.isRead = notification.isRead
    this.createdAt = notification.createdAt
  }
}

export class GetListNotificationPresenter {
  @ApiProperty({
    type: NotificationPresenter,
    isArray: true,
  })
  data!: NotificationPresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: NotificationEntity[], pagination: Pagination) {
    this.data = data.map((item) => new NotificationPresenter(item))
    this.pagination = pagination
  }
}
