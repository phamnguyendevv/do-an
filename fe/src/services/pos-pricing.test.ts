import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber } from "@/utils/format";
import { orderService } from "@/services/order-service";
import { store } from "@/services/store";
import type { Book } from "@/types";

const getBookSellingPrice = (b: Book): number => {
  const price = b.sellingPrice ?? (b as any).price ?? 0;
  return Number(price) || 0;
};

const checkCashInsufficient = (
  paymentMethod: "CASH" | "SEPAY" | "CARD",
  total: number,
  receivedCash: number | "" | undefined | null,
): boolean => {
  return (
    paymentMethod === "CASH" &&
    total > 0 &&
    (typeof receivedCash !== "number" || isNaN(receivedCash) || receivedCash < total)
  );
};

describe("POS Pricing & Calculations", () => {
  it("lấy giá bán sách chính xác từ sellingPrice hoặc alias price", () => {
    const bookWithSellingPrice: Book = {
      id: "1",
      title: "Đắc Nhân Tâm",
      author: "Dale Carnegie",
      category: "Kỹ năng sống",
      purchasePrice: 65000,
      sellingPrice: 95000,
      stock: 50,
      minStock: 10,
      status: "IN_STOCK",
      createdAt: new Date().toISOString(),
    };

    expect(getBookSellingPrice(bookWithSellingPrice)).toBe(95000);
    expect(formatCurrency(getBookSellingPrice(bookWithSellingPrice))).toBe("95.000 ₫");

    const bookWithLegacyPrice: any = {
      id: "2",
      title: "Nhà Giả Kim",
      author: "Paulo Coelho",
      category: "Tiểu thuyết",
      purchasePrice: 50000,
      price: 79000,
      stock: 30,
      minStock: 5,
      status: "IN_STOCK",
      createdAt: new Date().toISOString(),
    };

    expect(getBookSellingPrice(bookWithLegacyPrice)).toBe(79000);
    expect(formatCurrency(getBookSellingPrice(bookWithLegacyPrice))).toBe("79.000 ₫");
  });

  it("tính toán tổng tiền giỏ hàng POS chính xác khi có nhiều sản phẩm và chiết khấu", () => {
    const cart = [
      { price: 95000, quantity: 2 }, // 190.000
      { price: 79000, quantity: 3 }, // 237.000
    ];

    const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
    expect(subtotal).toBe(427000);

    const discount = 27000;
    const total = Math.max(0, subtotal - discount);
    expect(total).toBe(400000);

    // Tiền khách đưa 500k -> thối 100k
    const receivedCash = 500000;
    const changeCash = Math.max(0, receivedCash - total);
    expect(changeCash).toBe(100000);
  });

  it("kiểm tra hợp lệ tiền khách đưa: không nhập tiền hoặc nhập ít hơn thì chưa sáng nút thanh toán", () => {
    const total = 400000;

    // Chưa nhập tiền (rỗng "")
    expect(checkCashInsufficient("CASH", total, "")).toBe(true);

    // Chưa nhập tiền (undefined hoặc null)
    expect(checkCashInsufficient("CASH", total, undefined)).toBe(true);
    expect(checkCashInsufficient("CASH", total, null)).toBe(true);

    // Nhập tiền ít hơn tổng cộng (ví dụ 300k < 400k)
    expect(checkCashInsufficient("CASH", total, 300000)).toBe(true);

    // Nhập đúng đủ tiền (400k)
    expect(checkCashInsufficient("CASH", total, 400000)).toBe(false);

    // Nhập dư tiền (500k)
    expect(checkCashInsufficient("CASH", total, 500000)).toBe(false);

    // Phương thức thanh toán SePay hoặc Thẻ POS không bắt buộc tiền mặt
    expect(checkCashInsufficient("SEPAY", total, "")).toBe(false);
    expect(checkCashInsufficient("CARD", total, "")).toBe(false);
  });

  it("formatCurrency không bị crash hoặc ra NaN với null, undefined hoặc số 0", () => {
    expect(formatCurrency(undefined)).toBe("0 ₫");
    expect(formatCurrency(null)).toBe("0 ₫");
    expect(formatCurrency(0)).toBe("0 ₫");
    expect(formatCurrency(NaN)).toBe("0 ₫");
    expect(formatCurrency(150000)).toBe("150.000 ₫");
  });

  it("đơn hàng tạo từ bán lẻ POS phải có trạng thái là DELIVERED và thanh toán PAID", async () => {
    store.setState({
      books: [
        {
          id: "pos-book-1",
          title: "Sách POS Test",
          author: "Tác giả POS",
          category: "Thử nghiệm",
          purchasePrice: 40000,
          sellingPrice: 80000,
          stock: 20,
          minStock: 5,
          status: "IN_STOCK",
          createdAt: new Date().toISOString(),
        },
      ],
      orders: [],
      shipments: [],
    });

    const res = await orderService.createOrder({
      customerName: "Khách lẻ tại quầy",
      customerPhone: "0911223344",
      customerAddress: "Bán trực tiếp tại quầy POS",
      shippingMethod: "Bán tại quầy (POS)",
      shippingFee: 0,
      discount: 0,
      status: "DELIVERED",
      payment: "PAID",
      lines: [{ bookId: "pos-book-1", quantity: 2, price: 80000 }],
    });

    expect(res.ok).toBe(true);
    expect(res.data?.status).toBe("DELIVERED");
    expect(res.data?.payment).toBe("PAID");
  });
});
