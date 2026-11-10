import { describe, expect, it } from "vitest";

import { mapOrderApiItem, type OrderApiItem } from "./order-api";

describe("mapOrderApiItem", () => {
  it("normalizes API identifiers and numeric fields for the UI order model", () => {
    const apiOrder: OrderApiItem = {
      id: 21,
      orderCode: "DH-123456",
      customerName: "Khách tại quầy",
      customerPhone: "0900000000",
      customerAddress: "Bán trực tiếp tại quầy POS",
      items: [{ bookId: 7, title: "Sách", quantity: 2, price: 25000 }],
      subtotal: 50000,
      discount: 5000,
      shippingFee: 0,
      total: 45000,
      payment: "UNPAID",
      shippingMethod: "Bán tại quầy (POS)",
      status: "PENDING",
      expiresAt: "2025-01-01T00:05:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    expect(mapOrderApiItem(apiOrder)).toMatchObject({
      id: "21",
      orderCode: "DH-123456",
      customerAddress: "Bán trực tiếp tại quầy POS",
      items: [{ bookId: "7", title: "Sách", quantity: 2, price: 25000 }],
      total: 45000,
      payment: "UNPAID",
      status: "PENDING",
    });
  });
});
