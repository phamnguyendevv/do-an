import type { Order, OrderStatus, PaymentStatus } from "@/types";

const sampleTitles = [
  { id: "1", title: "Clean Code: A Handbook of Agile Software Craftsmanship", price: 349000 },
  { id: "2", title: "Designing Data-Intensive Applications", price: 420000 },
  { id: "3", title: "Đắc nhân tâm (Tái bản 2024)", price: 98000 },
  { id: "4", title: "Nhà giả kim", price: 89000 },
  { id: "5", title: "Sapiens: Lược sử loài người", price: 189000 },
  { id: "6", title: "Tư duy nhanh và chậm", price: 215000 },
];

const customers: Array<[string, string, string]> = [
  ["Trần Thị Mai", "0901234567", "12 Nguyễn Huệ, Q.1, TP.HCM"],
  ["Nguyễn Văn Hùng", "0912345678", "45 Lê Lợi, Hải Châu, Đà Nẵng"],
  ["Phạm Thu Trang", "0987654321", "88 Trần Phú, Ba Đình, Hà Nội"],
  ["Lê Quốc Anh", "0933221100", "27 Hai Bà Trưng, Q.3, TP.HCM"],
  ["Đỗ Minh Châu", "0977889900", "5 Nguyễn Trãi, Thanh Xuân, Hà Nội"],
  ["Vũ Hải Nam", "0944556677", "19 Bạch Đằng, Ngô Quyền, Hải Phòng"],
  ["Hoàng Lan Anh", "0966554433", "301 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM"],
  ["Bùi Tiến Dũng", "0955443322", "77 Lý Thường Kiệt, Huế"],
];

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPING",
  "DELIVERED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const payments: PaymentStatus[] = ["PAID", "UNPAID", "PAID", "PAID", "UNPAID", "REFUNDED"];
const methods = ["Giao hàng nhanh", "Viettel Post", "GHTK", "J&T Express"];

export const mockOrders: Order[] = Array.from({ length: 24 }).map((_, i) => {
  const customer = customers[i % customers.length]!;
  const items = Array.from({ length: (i % 3) + 1 }).map((__, j) => {
    const book = sampleTitles[(i * 3 + j) % sampleTitles.length]!;
    const quantity = ((i + j) % 4) + 1;
    return { bookId: book.id, title: book.title, quantity, price: book.price };
  });
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discount = i % 4 === 0 ? Math.round(subtotal * 0.05) : 0;
  const shippingFee = subtotal > 500000 ? 0 : 30000;

  return {
    id: `ORD-${2025000 + i + 1}`,
    customerName: customer[0],
    customerPhone: customer[1],
    customerAddress: customer[2],
    items,
    subtotal,
    discount,
    shippingFee,
    total: subtotal - discount + shippingFee,
    payment: payments[i % payments.length]!,
    shippingMethod: methods[i % methods.length]!,
    status: statuses[i % statuses.length]!,
    createdAt: new Date(2026, 7, ((i * 2) % 13) + 1, 9 + (i % 8), (i * 7) % 60).toISOString(),
  } satisfies Order;
});

export const recentOrders = mockOrders.slice(0, 6);
