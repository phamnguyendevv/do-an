export enum OrderStatusEnum {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Preparing = 'PREPARING',
  Shipping = 'SHIPPING',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
  Returned = 'RETURNED',
  Failed = 'FAILED',
}

export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatusEnum,
  readonly OrderStatusEnum[]
> = {
  [OrderStatusEnum.Pending]: [
    OrderStatusEnum.Confirmed,
    OrderStatusEnum.Cancelled,
  ],
  [OrderStatusEnum.Confirmed]: [
    OrderStatusEnum.Preparing,
    OrderStatusEnum.Cancelled,
  ],
  [OrderStatusEnum.Preparing]: [
    OrderStatusEnum.Shipping,
    OrderStatusEnum.Cancelled,
  ],
  [OrderStatusEnum.Shipping]: [
    OrderStatusEnum.Delivered,
    OrderStatusEnum.Failed,
  ],
  [OrderStatusEnum.Delivered]: [OrderStatusEnum.Returned],
  [OrderStatusEnum.Cancelled]: [],
  [OrderStatusEnum.Returned]: [],
  [OrderStatusEnum.Failed]: [
    OrderStatusEnum.Returned,
    OrderStatusEnum.Shipping,
  ],
}

export const isValidOrderStatusTransition = (
  current: OrderStatusEnum | string,
  next: OrderStatusEnum | string,
): boolean =>
  Object.values(OrderStatusEnum).includes(current as OrderStatusEnum) &&
  Object.values(OrderStatusEnum).includes(next as OrderStatusEnum) &&
  (current === next ||
    ORDER_STATUS_TRANSITIONS[current as OrderStatusEnum].includes(
      next as OrderStatusEnum,
    ))

export enum PaymentStatusEnum {
  Unpaid = 'UNPAID',
  Paid = 'PAID',
  Refunded = 'REFUNDED',
}

export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatusEnum,
  readonly PaymentStatusEnum[]
> = {
  [PaymentStatusEnum.Unpaid]: [PaymentStatusEnum.Paid],
  [PaymentStatusEnum.Paid]: [PaymentStatusEnum.Refunded],
  [PaymentStatusEnum.Refunded]: [],
}

export const isValidPaymentStatusTransition = (
  current: PaymentStatusEnum | string,
  next: PaymentStatusEnum | string,
): boolean =>
  Object.values(PaymentStatusEnum).includes(current as PaymentStatusEnum) &&
  Object.values(PaymentStatusEnum).includes(next as PaymentStatusEnum) &&
  (current === next ||
    PAYMENT_STATUS_TRANSITIONS[current as PaymentStatusEnum].includes(
      next as PaymentStatusEnum,
    ))

export enum BookStatusEnum {
  InStock = 'IN_STOCK',
  LowStock = 'LOW_STOCK',
  OutOfStock = 'OUT_OF_STOCK',
  Discontinued = 'DISCONTINUED',
}

export enum PromotionDiscountTypeEnum {
  Percentage = 'PERCENTAGE',
  Fixed = 'FIXED',
}
