import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'

import { DataSource } from 'typeorm'

import {
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@domain/entities/order-enums.entity'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'

import { UpdateBookstoreOrderStatusUseCase } from './update-order-status.use-case'

const EXPIRY_CHECK_INTERVAL_MS = 15_000
const EXPIRY_BATCH_SIZE = 50

@Injectable()
export class ExpirePendingPosOrdersService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ExpirePendingPosOrdersService.name)
  private timer?: ReturnType<typeof setInterval>
  private isRunning = false

  constructor(
    private readonly dataSource: DataSource,
    private readonly updateOrderStatus: UpdateBookstoreOrderStatusUseCase,
  ) {}

  onModuleInit() {
    void this.expirePendingOrders()
    this.timer = setInterval(
      () => void this.expirePendingOrders(),
      EXPIRY_CHECK_INTERVAL_MS,
    )
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async expirePendingOrders() {
    if (this.isRunning) return
    this.isRunning = true
    try {
      const overdueOrders = await this.dataSource
        .getRepository(BookstoreOrder)
        .createQueryBuilder('order')
        .select('order.id', 'id')
        .where('order.status = :status', { status: OrderStatusEnum.Pending })
        .andWhere('order.payment = :payment', {
          payment: PaymentStatusEnum.Unpaid,
        })
        .andWhere('order.expiresAt IS NOT NULL')
        .andWhere('order.expiresAt <= :now', { now: new Date() })
        .orderBy('order.expiresAt', 'ASC')
        .take(EXPIRY_BATCH_SIZE)
        .getRawMany<{ id: number | string }>()

      for (const { id } of overdueOrders) {
        await this.updateOrderStatus.execute(
          Number(id),
          OrderStatusEnum.Cancelled,
          {
            actor: 'System/POS expiry',
            note: 'Đơn POS hết thời hạn thanh toán 5 phút; tồn kho đã được hoàn lại.',
            expectedStatus: OrderStatusEnum.Pending,
            expectedPayment: PaymentStatusEnum.Unpaid,
          },
        )
      }
    } catch (error) {
      this.logger.error(
        'Không thể xử lý các đơn POS đã hết hạn',
        error instanceof Error ? error.stack : String(error),
      )
    } finally {
      this.isRunning = false
    }
  }
}
