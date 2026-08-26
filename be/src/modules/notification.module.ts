import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { NOTIFICATION_REPOSITORY } from '@domain/repositories/notification.repository.interface'
import { NOTIFICATION_SERVICE } from '@domain/services/notification.interface'

import { CreateNotificationUseCase } from '@use-cases/notification/create-notification.use-case'
import { DeleteNotificationUseCase } from '@use-cases/notification/delete-notification.use-case'
import { GetNotificationsUseCase } from '@use-cases/notification/get-notifications.use-case'
import { GetUnreadCountUseCase } from '@use-cases/notification/get-unread-count.use-case'
import { MarkAllAsReadUseCase } from '@use-cases/notification/mark-all-as-read.use-case'
import { MarkAsReadUseCase } from '@use-cases/notification/mark-as-read.use-case'

import { NotificationController } from '@adapters/controllers/notification/notification.controller'
import { NotificationGateway } from '@adapters/gateways/notification/notification.gateway'

import { Notification } from '@infrastructure/databases/postgressql/entities/notification.entity'
import { NotificationRepository } from '@infrastructure/databases/postgressql/repositories/notification.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { JwtModule } from '@infrastructure/services/jwt/jwt.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule,
    ExceptionsModule,
  ],
  controllers: [NotificationController],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationRepository,
    },

    CreateNotificationUseCase,
    GetNotificationsUseCase,
    MarkAsReadUseCase,
    MarkAllAsReadUseCase,
    GetUnreadCountUseCase,
    DeleteNotificationUseCase,
    NotificationGateway,
    {
      provide: NOTIFICATION_SERVICE,
      useExisting: NotificationGateway,
    },
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    NOTIFICATION_SERVICE,
    CreateNotificationUseCase,
  ],
})
export class NotificationModule {}
