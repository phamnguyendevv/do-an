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

export enum PaymentStatusEnum {
  Unpaid = 'UNPAID',
  Paid = 'PAID',
  Refunded = 'REFUNDED',
}

export enum BookStatusEnum {
  InStock = 'IN_STOCK',
  LowStock = 'LOW_STOCK',
  OutOfStock = 'OUT_OF_STOCK',
  Discontinued = 'DISCONTINUED',
}
