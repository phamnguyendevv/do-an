import { Inject, Injectable, Logger, Optional } from '@nestjs/common'

import { DataSource, ILike } from 'typeorm'

import { ISePayWebhookInput } from '@domain/entities/bookstore-order.entity'
import {
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@domain/entities/order-enums.entity'
import { OrderHistoryActionEnum } from '@domain/entities/order-history.entity'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from '@domain/services/payment-gateway.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { PaymentTransaction } from '@infrastructure/databases/postgresql/entities/payment-transaction.entity'

export interface ProcessSepayResult {
  success: boolean
  message: string
  orderCode?: string
  status?: string
  payment?: string
  total?: number
  error?: string
}

@Injectable()
export class ProcessSepayPaymentUseCase {
  private readonly logger = new Logger(ProcessSepayPaymentUseCase.name)

  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(REDIS_SERVICE)
    private readonly redisService?: IRedisCacheService,
    @Optional()
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway?: IPaymentGateway,
  ) {}

  async execute(payload: ISePayWebhookInput): Promise<ProcessSepayResult> {
    this.logger.log(`SePay Webhook received: ${JSON.stringify(payload)}`)

    if (payload.transferType && payload.transferType.toLowerCase() !== 'in') {
      return {
        success: true,
        message: 'Bỏ qua giao dịch chuyển tiền đi (transferType != in)',
      }
    }

    const textToSearch = `${payload.content || ''} ${payload.description || ''} ${payload.code || ''} ${payload.referenceCode || ''}`
    this.logger.log(`Scanning text for order code: "${textToSearch}"`)

    const ordMatch = textToSearch.match(/ORD[-_]?\d+/i)
    const dhMatch = textToSearch.match(/DH[-_]?\d+/i)
    const numMatch = textToSearch.match(/\b\d{4,8}\b/)

    let rawCode = ''
    let codeWithHyphen = ''
    let codeWithoutHyphen = ''
    let extractedDigits = ''

    if (dhMatch) {
      rawCode = dhMatch[0].toUpperCase()
      extractedDigits = rawCode.replace(/\D/g, '')
      codeWithHyphen = `DH-${extractedDigits}`
      codeWithoutHyphen = `DH${extractedDigits}`
    } else if (ordMatch) {
      rawCode = ordMatch[0].toUpperCase()
      extractedDigits = rawCode.replace(/\D/g, '')
      codeWithHyphen = `ORD-${extractedDigits}`
      codeWithoutHyphen = `ORD${extractedDigits}`
    } else if (numMatch) {
      rawCode = numMatch[0]
      extractedDigits = rawCode
      codeWithHyphen = `DH-${rawCode}`
      codeWithoutHyphen = `DH${rawCode}`
    }

    const referenceCode = String(
      payload.referenceCode || payload.code || payload.id || '',
    ).trim()

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      if (referenceCode) {
        const existingTx = await queryRunner.manager.findOne(
          PaymentTransaction,
          {
            where: { referenceCode },
          },
        )
        if (existingTx) {
          this.logger.warn(
            `SePay Webhook duplicate referenceCode: ${referenceCode}`,
          )
          await queryRunner.rollbackTransaction()
          return {
            success: true,
            message: 'Giao dịch đã được xử lý trước đó (Idempotency duplicate)',
            orderCode: existingTx.orderCode,
            status: existingTx.status,
          }
        }
      }

      let order: BookstoreOrder | null = null

      if (extractedDigits) {
        order = await queryRunner.manager.findOne(BookstoreOrder, {
          where: [
            { orderCode: codeWithHyphen },
            { orderCode: codeWithoutHyphen },
            { orderCode: `ORD-${extractedDigits}` },
            { orderCode: `ORD${extractedDigits}` },
            { orderCode: rawCode },
            { orderCode: ILike(`%${extractedDigits}%`) },
            { trackingCode: codeWithHyphen },
            { trackingCode: codeWithoutHyphen },
          ],
          lock: { mode: 'pessimistic_write' },
        })
      }

      const transferAmount = Number(payload.transferAmount || 0)

      if (!order && transferAmount > 0) {
        order = await queryRunner.manager.findOne(BookstoreOrder, {
          where: [
            { payment: PaymentStatusEnum.Unpaid, total: transferAmount },
            { status: OrderStatusEnum.Pending, total: transferAmount },
          ],
          order: { createdAt: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        })
      }

      if (!order) {
        const fallbackOrderCode =
          codeWithHyphen || `DH-${Date.now().toString().slice(-6)}`
        this.logger.log(
          `Tự động tạo đơn hàng mới từ Webhook SePay: ${fallbackOrderCode}`,
        )

        order = queryRunner.manager.create(BookstoreOrder, {
          orderCode: fallbackOrderCode,
          customerName: 'Khách thanh toán SePay QR',
          customerPhone: '0900000000',
          customerAddress: 'Bán lẻ tại quầy POS',
          shippingMethod: 'Bán tại quầy (POS)',
          shippingFee: 0,
          discount: 0,
          subtotal: transferAmount,
          total: transferAmount,
          payment: PaymentStatusEnum.Paid,
          status: OrderStatusEnum.Delivered,
          note: `Tự động ghi nhận từ SePay: ${payload.gateway || 'Bank'} - ${payload.content || ''}`,
          items: [
            {
              bookId: 0,
              title: 'Thanh toán SePay QR tại quầy',
              quantity: 1,
              price: transferAmount,
            },
          ],
        })

        const savedNew = await queryRunner.manager.save(BookstoreOrder, order)

        // Save Order History for Auto Created Order
        const history = queryRunner.manager.create(OrderHistory, {
          orderId: savedNew.id,
          orderCode: savedNew.orderCode,
          action: OrderHistoryActionEnum.SepayPayment,
          fromStatus: OrderStatusEnum.Pending,
          toStatus: OrderStatusEnum.Delivered,
          fromPayment: PaymentStatusEnum.Unpaid,
          toPayment: PaymentStatusEnum.Paid,
          title: 'Tự động tạo đơn & thanh toán SePay QR',
          note: `Nhận ${transferAmount.toLocaleString('vi-VN')}đ qua SePay (${payload.gateway || 'Ngân hàng'}). Mã tham chiếu: ${payload.referenceCode || payload.code || 'N/A'}. Nội dung: "${payload.content || ''}"`,
          actor: 'SePay Webhook',
          actorRole: 'WEBHOOK',
          metadata: {
            transferAmount,
            gateway: payload.gateway,
            transactionDate: payload.transactionDate,
            accountNumber: payload.accountNumber,
            content: payload.content,
            referenceCode: payload.referenceCode || payload.code,
          },
        })
        await queryRunner.manager.save(OrderHistory, history)

        if (referenceCode) {
          const paymentTx = queryRunner.manager.create(PaymentTransaction, {
            referenceCode,
            gateway: payload.gateway,
            accountNumber: payload.accountNumber,
            transferAmount,
            orderCode: savedNew.orderCode,
            orderId: savedNew.id,
            content: payload.content,
            status: 'AUTO_CREATED',
            rawPayload: payload as unknown as Record<string, unknown>,
          })
          await queryRunner.manager.save(PaymentTransaction, paymentTx)
        }

        await queryRunner.commitTransaction()

        await this.redisService?.delPattern('orders:*')

        // Push real-time payment update via WebSocket
        this.paymentGateway?.emitPaymentSuccess({
          orderCode: savedNew.orderCode,
          orderId: savedNew.id,
          amount: Number(savedNew.total),
          paymentStatus: PaymentStatusEnum.Paid,
          transactionDate: payload.transactionDate,
          gateway: payload.gateway,
        })

        return {
          success: true,
          message: 'Tự động tạo và xác nhận thanh toán SePay thành công!',
          orderCode: savedNew.orderCode,
          status: String(savedNew.status),
          payment: String(savedNew.payment),
          total: Number(savedNew.total),
        }
      }

      const orderTotal = Number(order.total || 0)
      this.logger.log(
        `Khớp đơn hàng ${order.orderCode} (Tổng: ${orderTotal}đ, Số tiền nhận: ${transferAmount}đ)`,
      )

      const previousStatus = String(order.status)
      const previousPayment = String(order.payment)

      order.payment = PaymentStatusEnum.Paid
      if (order.status === OrderStatusEnum.Pending) {
        if (
          order.shippingMethod?.includes('POS') ||
          order.shippingMethod?.includes('quầy')
        ) {
          order.status = OrderStatusEnum.Delivered
        } else {
          order.status = OrderStatusEnum.Confirmed
        }
      }

      const updatedOrder = await queryRunner.manager.save(BookstoreOrder, order)

      // Save Order History for Matched Order
      const history = queryRunner.manager.create(OrderHistory, {
        orderId: updatedOrder.id,
        orderCode: updatedOrder.orderCode,
        action: OrderHistoryActionEnum.SepayPayment,
        fromStatus: previousStatus,
        toStatus: String(updatedOrder.status),
        fromPayment: previousPayment,
        toPayment: PaymentStatusEnum.Paid,
        title: 'Xác nhận thanh toán tự động qua SePay QR',
        note: `Nhận ${transferAmount.toLocaleString('vi-VN')}đ qua SePay (${payload.gateway || 'Ngân hàng'}). Mã tham chiếu: ${payload.referenceCode || payload.code || 'N/A'}. Nội dung: "${payload.content || ''}". Trạng thái đơn: ${previousStatus} → ${updatedOrder.status}.`,
        actor: 'SePay Webhook',
        actorRole: 'WEBHOOK',
        metadata: {
          transferAmount,
          orderTotal,
          gateway: payload.gateway,
          transactionDate: payload.transactionDate,
          accountNumber: payload.accountNumber,
          content: payload.content,
          referenceCode: payload.referenceCode || payload.code,
        },
      })
      await queryRunner.manager.save(OrderHistory, history)

      if (referenceCode) {
        const paymentTx = queryRunner.manager.create(PaymentTransaction, {
          referenceCode,
          gateway: payload.gateway,
          accountNumber: payload.accountNumber,
          transferAmount,
          orderCode: updatedOrder.orderCode,
          orderId: updatedOrder.id,
          content: payload.content,
          status: 'SUCCESS',
          rawPayload: payload as unknown as Record<string, unknown>,
        })
        await queryRunner.manager.save(PaymentTransaction, paymentTx)
      }

      await queryRunner.commitTransaction()

      await this.redisService?.delPattern('orders:*')

      // Push real-time payment update via WebSocket
      this.paymentGateway?.emitPaymentSuccess({
        orderCode: updatedOrder.orderCode,
        orderId: updatedOrder.id,
        amount: Number(updatedOrder.total),
        paymentStatus: PaymentStatusEnum.Paid,
        transactionDate: payload.transactionDate,
        gateway: payload.gateway,
      })

      return {
        success: true,
        message: 'Xác nhận thanh toán tự động SePay thành công!',
        orderCode: updatedOrder.orderCode,
        status: String(updatedOrder.status),
        payment: String(updatedOrder.payment),
        total: Number(updatedOrder.total),
      }
    } catch (error: any) {
      await queryRunner.rollbackTransaction()
      this.logger.error('Lỗi khi xử lý SePay Webhook:', error)
      return {
        success: false,
        message: 'Lỗi khi xử lý SePay Webhook',
        error: error.message,
      }
    } finally {
      await queryRunner.release()
    }
  }
}
