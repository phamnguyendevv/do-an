export const BOOK_STATUSES = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "DISCONTINUED"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description?: string | undefined;
  categoryId?: string | undefined;
  publisher?: string | undefined;
  publisherId?: string | undefined;
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

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "RETURNED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "FAILED"],
  DELIVERED: ["RETURNED"],
  FAILED: ["RETURNED", "SHIPPING"],
  CANCELLED: [],
  RETURNED: [],
};

export const PAYMENT_STATUSES = ["PAID", "UNPAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  UNPAID: ["PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

export interface OrderItem {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
  purchasePrice?: number | undefined;
}

export interface Order {
  id: string;
  orderCode?: string | undefined;
  customerId?: string | undefined;
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
  supplierId?: string | undefined;
  date: string;
  totalItems: number;
  totalValue: number;
  items?: ReceiptItem[] | undefined;
  note?: string | undefined;
}

export interface ExportReceipt {
  id: string;
  orderId: string;
  date: string;
  totalItems: number;
  items?: ReceiptItem[] | undefined;
  reason: string;
  note?: string | undefined;
}

export interface ReceiptItem {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
}

export const SHIPPING_STATUSES = [
  "WAITING_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
] as const;
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export const SHIPPING_STATUS_TRANSITIONS: Record<ShippingStatus, readonly ShippingStatus[]> = {
  WAITING_PICKUP: ["PICKED_UP", "FAILED", "RETURNED", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED", "RETURNED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  FAILED: ["PICKED_UP", "IN_TRANSIT", "RETURNED"],
  RETURNED: [],
  CANCELLED: [],
} as const satisfies Record<ShippingStatus, readonly ShippingStatus[]>;

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

export interface StockMovement {
  id: string;
  bookId: string;
  bookTitle: string;
  type: "IMPORT" | "EXPORT" | "SALE" | "RESTOCK" | "ADJUST";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  referenceCode?: string | undefined;
  note?: string | undefined;
  createdBy?: string | undefined;
  createdAt: string;
}

export interface StocktakeItem {
  bookId: string;
  title: string;
  systemStock: number;
  actualStock: number;
  diffQuantity: number;
  reason?: string | undefined;
}

export interface Stocktake {
  id: string;
  title: string;
  auditDate: string;
  status: "DRAFT" | "BALANCED";
  items: StocktakeItem[];
  totalSystemStock: number;
  totalActualStock: number;
  totalDiff: number;
  note?: string | undefined;
  auditedBy?: string | undefined;
  balancedAt?: string | undefined;
  createdAt?: string | undefined;
}

export interface Category {
  id: string;
  name: string;
  description?: string | undefined;
}

export interface Publisher {
  id: string;
  name: string;
  description?: string | undefined;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
  note?: string | undefined;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | undefined;
  address?: string | undefined;
  note?: string | undefined;
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
