import { Injectable, Logger, UseGuards } from '@nestjs/common'
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

import {
  IPaymentGateway,
  IPaymentSuccessPayload,
} from '@domain/services/payment-gateway.interface'

import { WsJwtAuthGuard } from '@adapters/controllers/common/guards/jwt-socket.guard'

import { Notification } from '@infrastructure/databases/postgresql/entities/notification.entity'

export type PaymentSuccessEventPayload = IPaymentSuccessPayload
type AuthenticatedSocket = Socket & { userId?: number }

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
@Injectable()
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect, IPaymentGateway
{
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(PaymentGateway.name)

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to PaymentGateway: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from PaymentGateway: ${client.id}`)
  }

  @SubscribeMessage('subscribe_order')
  handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderCode: string },
  ) {
    if (data?.orderCode) {
      const room = `order_${data.orderCode}`
      void client.join(room)
      this.logger.log(`Client ${client.id} joined room ${room}`)
      return { status: 'subscribed', room }
    }
  }

  @SubscribeMessage('unsubscribe_order')
  async handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderCode: string },
  ) {
    if (data?.orderCode) {
      const room = `order_${data.orderCode}`
      await client.leave(room)
      this.logger.log(`Client ${client.id} left room ${room}`)
      return { status: 'unsubscribed', room }
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('notifications:subscribe')
  async subscribeNotifications(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return { status: 'unauthorized' }
    const room = `user_${client.userId}`
    await client.join(room)
    return { status: 'subscribed', room }
  }

  emitNotification(actorId: number, notification: Notification) {
    if (!this.server) {
      this.logger.warn('WebSocket server is not initialized yet')
      return
    }

    this.server.to(`user_${actorId}`).emit('notification:created', notification)
  }

  emitNotificationRead(actorId: number, id: string) {
    if (!this.server) return
    this.server.to(`user_${actorId}`).emit('notification:read', { id })
  }

  emitNotificationDeleted(actorId: number, id: string) {
    if (!this.server) return
    this.server.to(`user_${actorId}`).emit('notification:deleted', { id })
  }

  emitNotificationsReadAll(actorId: number) {
    if (!this.server) return
    this.server.to(`user_${actorId}`).emit('notification:read-all')
  }

  emitNotificationsCleared(actorId: number) {
    if (!this.server) return
    this.server.to(`user_${actorId}`).emit('notification:cleared')
  }

  emitPaymentSuccess(payload: PaymentSuccessEventPayload) {
    if (!this.server) {
      this.logger.warn('WebSocket server is not initialized yet')
      return
    }

    const room = `order_${payload.orderCode}`

    this.server.to(room).emit('payment_success', payload)

    this.server.emit('sepay_payment_received', payload)

    this.logger.log(
      `WebSocket broadcasted payment update for order ${payload.orderCode} (Amount: ${payload.amount})`,
    )
  }
}
