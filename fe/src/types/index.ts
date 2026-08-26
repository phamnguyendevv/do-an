export type BookStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "DISCONTINUED";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status: BookStatus;
  createdAt: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED"
  | "RETURNED";

export type PaymentStatus = "PAID" | "UNPAID" | "REFUNDED";

export interface OrderItem {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  payment: PaymentStatus;
  shippingMethod: string;
  trackingCode?: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface ImportReceipt {
  id: string;
  supplier: string;
  date: string;
  totalItems: number;
  totalValue: number;
  note?: string;
}

export interface ExportReceipt {
  id: string;
  orderId: string;
  date: string;
  totalItems: number;
  reason: string;
  note?: string;
}

export type ShippingStatus =
  | "WAITING_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

export interface Shipping {
  id: string;
  orderId: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  shippingFee: number;
  expectedDelivery: string;
  status: ShippingStatus;
  address: string;
}

export type UserRole = "ADMIN" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin: string;
}
