import { Inject, Injectable, Logger } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'

import { Server, Socket } from 'socket.io'

import { NotificationEntity } from '@domain/entities/notification.entity'
import { IJwtService, JWT_SERVICE } from '@domain/services/jwt.interface'
import { INotificationService } from '@domain/services/notification.interface'

import { DeleteNotificationUseCase } from '@use-cases/notification/delete-notification.use-case'
import { GetNotificationsUseCase } from '@use-cases/notification/get-notifications.use-case'
import { GetUnreadCountUseCase } from '@use-cases/notification/get-unread-count.use-case'
import { MarkAllAsReadUseCase } from '@use-cases/notification/mark-all-as-read.use-case'
import { MarkAsReadUseCase } from '@use-cases/notification/mark-as-read.use-case'

import {
  GetListNotificationPresenter,
  NotificationPresenter,
} from '@adapters/controllers/notification/presenters/get-list-pesenters'

import {
  DeleteNotificationSocketDto,
  GetNotificationsSocketDto,
  MarkAsReadSocketDto,
} from './dto/get-notification-socket.dto'

interface IAuthenticatedSocket extends Socket {
  userId?: number
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@Injectable()
@ApiBearerAuth()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, INotificationService
{
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(NotificationGateway.name)
  private connectedUsers = new Map<number, string[]>()

  constructor(
    @Inject(JWT_SERVICE)
    private readonly jwtService: IJwtService,
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
  ) {}

  async handleConnection(client: IAuthenticatedSocket) {
    try {
      const userIdString =
        typeof client.handshake.auth?.userId === 'string'
          ? client.handshake.auth.userId
          : undefined

      if (!userIdString) {
        this.logger.error('No userId provided in connection')
        client.emit('error', { message: 'userId is required' })
        client.disconnect()
        return
      }
      // Parse userId về number
      const userId = parseInt(userIdString)
      if (isNaN(userId)) {
        this.logger.error('Invalid userId format:', userIdString)
        client.emit('error', { message: 'Invalid userId format' })
        client.disconnect()
        return
      }

      client.userId = userId
      await client.join(`user_${userId}`)

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, [])
      }
      this.connectedUsers.get(userId)!.push(client.id)

      this.logger.log(`User ${userId} connected with socket ${client.id}`)

      const unreadCount = await this.getUnreadCountUseCase.execute({ userId })
      client.emit('unreadCount', unreadCount)
    } catch (error) {
      this.logger.error('Authentication failed:', error)
      client.disconnect()
    }
  }

  handleDisconnect(client: IAuthenticatedSocket) {
    if (client.userId) {
      const socketIds = this.connectedUsers.get(client.userId)
      if (socketIds) {
        const index = socketIds.indexOf(client.id)
        if (index > -1) {
          socketIds.splice(index, 1)
        }

        if (socketIds.length === 0) {
          this.connectedUsers.delete(client.userId)
        }
      }

      this.logger.log(`User ${client.userId} disconnected`)
    }
  }

  @SubscribeMessage('getNotifications')
  async handleGetNotifications(
    @MessageBody() data: GetNotificationsSocketDto,
    @ConnectedSocket() client: IAuthenticatedSocket,
  ) {
    if (!client.userId) return

    const result = await this.getNotificationsUseCase.execute({
      userId: client.userId,
      page: data.page,
      size: data.size,
    })

    client.emit('notifications', {
      data: new GetListNotificationPresenter(result.data, result.pagination),
    })
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadSocketDto,
    @ConnectedSocket() client: IAuthenticatedSocket,
  ) {
    if (!client.userId) return

    try {
      await this.markAsReadUseCase.execute({
        notificationId: data.notificationId,
        userId: client.userId,
      })

      const unreadCount = await this.getUnreadCountUseCase.execute({
        userId: client.userId,
      })
      client.emit('unreadCount', unreadCount)
      client.emit('notificationRead', { notificationId: data.notificationId })
    } catch {
      client.emit('error', { message: 'Failed to mark notification as read' })
    }
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(@ConnectedSocket() client: IAuthenticatedSocket) {
    if (!client.userId) return

    try {
      await this.markAllAsReadUseCase.execute({ userId: client.userId })

      const unreadCount = await this.getUnreadCountUseCase.execute({
        userId: client.userId,
      })
      client.emit('unreadCount', unreadCount)
      client.emit('allNotificationsRead')
    } catch {
      client.emit('error', {
        message: 'Failed to mark all notifications as read',
      })
    }
  }

  @SubscribeMessage('deleteNotification')
  async handleDeleteNotification(
    @MessageBody() data: DeleteNotificationSocketDto,
    @ConnectedSocket() client: IAuthenticatedSocket,
  ) {
    if (!client.userId) return

    try {
      await this.deleteNotificationUseCase.execute({
        notificationId: data.notificationId,
        userId: client.userId,
      })
      client.emit('notificationDeleted', {
        notificationId: data.notificationId,
      })
    } catch {
      client.emit('error', { message: 'Failed to delete notification' })
    }
  }

  async sendNotificationToUser(
    userId: number,
    notification: NotificationEntity,
  ): Promise<void> {
    this.server.to(`user_${userId}`).emit('newNotification', {
      data: new NotificationPresenter(notification),
    })
    const unreadCount = await this.getUnreadCountUseCase.execute({ userId })
    this.server.to(`user_${userId}`).emit('unreadCount', unreadCount)
  }
}
