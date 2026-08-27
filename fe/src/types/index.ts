export type BookStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "DISCONTINUED";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  publisher?: string | undefined;
  isbn?: string | undefined;
  purchasePrice: number;
  sellingPrice: number;
  price?: number | undefined;
  importPrice?: number | undefined;
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
  orderCode?: string | undefined;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  provinceId?: number | undefined;
  districtId?: number | undefined;
  wardCode?: string | undefined;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  payment: PaymentStatus;
  shippingMethod: string;
  trackingCode?: string | undefined;
  status: OrderStatus;
  note?: string | undefined;
  createdAt: string;
}

export interface ImportReceipt {
  id: string;
  supplier: string;
  date: string;
  totalItems: number;
  totalValue: number;
  note?: string | undefined;
}

export interface ExportReceipt {
  id: string;
  orderId: string;
  date: string;
  totalItems: number;
  reason: string;
  note?: string | undefined;
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
  avatar?: string | undefined;
  phone?: string | undefined;
  lastLogin?: string | undefined;
  addressProvince?: string | undefined;
  addressDistrict?: string | undefined;
  addressWard?: string | undefined;
  addressDetail?: string | undefined;
  emailVerified?: boolean | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export type OrderHistoryAction =
  | "CREATED"
  | "STATUS_CHANGE"
  | "PAYMENT_CHANGE"
  | "UPDATED_INFO"
  | "SEPAY_PAYMENT"
  | "GHN_SYNC"
  | "NOTE_ADDED"
  | "CANCELLED"
  | string;

export interface OrderHistoryItem {
  id: number;
  orderId: number;
  orderCode: string;
  action: OrderHistoryAction;
  fromStatus?: string | undefined;
  toStatus?: string | undefined;
  fromPayment?: string | undefined;
  toPayment?: string | undefined;
  title: string;
  note?: string | undefined;
  actor: string;
  actorRole?: string | undefined;
  metadata?: Record<string, any> | undefined;
  createdAt: string;
}
