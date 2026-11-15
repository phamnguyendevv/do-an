import { DataSource } from 'typeorm'

import {
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@domain/entities/order-enums.entity'

import { ExpirePendingPosOrdersService } from '@use-cases/orders/expire-pending-pos-orders.service'
import { UpdateBookstoreOrderStatusUseCase } from '@use-cases/orders/update-order-status.use-case'

describe('ExpirePendingPosOrdersService', () => {
  it('cancels each overdue unpaid POS order with guarded status and payment', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: 21 }, { id: 22 }]),
    }
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    } as unknown as DataSource
    const updateOrderStatus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as UpdateBookstoreOrderStatusUseCase
    const service = new ExpirePendingPosOrdersService(
      dataSource,
      updateOrderStatus,
    )
    const runExpiry = service as unknown as {
      expirePendingOrders: () => Promise<void>
    }

    await runExpiry.expirePendingOrders()

    expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1)
    expect(updateOrderStatus.execute).toHaveBeenNthCalledWith(
      1,
      21,
      OrderStatusEnum.Cancelled,
      expect.objectContaining({
        expectedStatus: OrderStatusEnum.Pending,
        expectedPayment: PaymentStatusEnum.Unpaid,
      }),
    )
    expect(updateOrderStatus.execute).toHaveBeenNthCalledWith(
      2,
      22,
      OrderStatusEnum.Cancelled,
      expect.objectContaining({
        expectedStatus: OrderStatusEnum.Pending,
        expectedPayment: PaymentStatusEnum.Unpaid,
      }),
    )
  })
})
