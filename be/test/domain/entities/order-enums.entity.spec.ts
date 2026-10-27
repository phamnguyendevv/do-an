import { validate } from 'class-validator'

import {
  OrderStatusEnum,
  PaymentStatusEnum,
  isValidOrderStatusTransition,
  isValidPaymentStatusTransition,
} from '@domain/entities/order-enums.entity'

import { UpdateOrderPaymentDto } from '@adapters/controllers/orders/dto/update-order-payment.dto'
import { UpdateOrderStatusDto } from '@adapters/controllers/orders/dto/update-order-status.dto'

describe('order status transitions', () => {
  it('allows the defined workflow transitions', () => {
    expect(
      isValidOrderStatusTransition(
        OrderStatusEnum.Pending,
        OrderStatusEnum.Confirmed,
      ),
    ).toBe(true)
    expect(
      isValidOrderStatusTransition(
        OrderStatusEnum.Failed,
        OrderStatusEnum.Shipping,
      ),
    ).toBe(true)
  })

  it('rejects invalid and unknown transitions while accepting idempotent updates', () => {
    expect(
      isValidOrderStatusTransition(
        OrderStatusEnum.Cancelled,
        OrderStatusEnum.Returned,
      ),
    ).toBe(false)
    expect(
      isValidOrderStatusTransition('UNKNOWN', OrderStatusEnum.Pending),
    ).toBe(false)
    expect(
      isValidOrderStatusTransition(
        OrderStatusEnum.Cancelled,
        OrderStatusEnum.Cancelled,
      ),
    ).toBe(true)
  })
})

describe('payment status transitions', () => {
  it('allows payment and refund transitions, but rejects refunding unpaid orders', () => {
    expect(
      isValidPaymentStatusTransition(
        PaymentStatusEnum.Unpaid,
        PaymentStatusEnum.Paid,
      ),
    ).toBe(true)
    expect(
      isValidPaymentStatusTransition(
        PaymentStatusEnum.Paid,
        PaymentStatusEnum.Refunded,
      ),
    ).toBe(true)
    expect(
      isValidPaymentStatusTransition(
        PaymentStatusEnum.Unpaid,
        PaymentStatusEnum.Refunded,
      ),
    ).toBe(false)
  })
})

describe('order API status contracts', () => {
  it('accepts defined statuses and rejects unknown status values', async () => {
    const validOrder = Object.assign(new UpdateOrderStatusDto(), {
      status: OrderStatusEnum.Failed,
    })
    const invalidOrder = Object.assign(new UpdateOrderStatusDto(), {
      status: 'UNKNOWN',
    })
    const validPayment = Object.assign(new UpdateOrderPaymentDto(), {
      payment: PaymentStatusEnum.Refunded,
    })
    const invalidPayment = Object.assign(new UpdateOrderPaymentDto(), {
      payment: 'UNKNOWN',
    })

    await expect(validate(validOrder)).resolves.toHaveLength(0)
    await expect(validate(invalidOrder)).resolves.not.toHaveLength(0)
    await expect(validate(validPayment)).resolves.toHaveLength(0)
    await expect(validate(invalidPayment)).resolves.not.toHaveLength(0)
  })
})
