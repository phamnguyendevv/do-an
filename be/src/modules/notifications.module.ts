import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { NotificationsController } from '@adapters/controllers/notifications/notifications.controller'

import { Notification } from '@infrastructure/databases/postgresql/entities/notification.entity'
import { User } from '@infrastructure/databases/postgresql/entities/user.entity'

import { SePayModule } from './sepay.module'

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), SePayModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
