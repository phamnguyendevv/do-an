import { Injectable, Logger } from '@nestjs/common'
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

export type PaymentSuccessEventPayload = IPaymentSuccessPayload

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect, IPaymentGateway {
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
      client.join(room)
      this.logger.log(`Client ${client.id} joined room ${room}`)
      return { status: 'subscribed', room }
    }
  }

  @SubscribeMessage('unsubscribe_order')
  handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderCode: string },
  ) {
    if (data?.orderCode) {
      const room = `order_${data.orderCode}`
      client.leave(room)
      this.logger.log(`Client ${client.id} left room ${room}`)
      return { status: 'unsubscribed', room }
    }
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
