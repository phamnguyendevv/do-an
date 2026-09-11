import { forwardRef } from "react";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { storeSettingsService } from "@/services/store-settings";
import type { OrderItem } from "@/types";

export interface ReceiptK80Props {
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  receivedAmount?: number;
  changeAmount?: number;
  paymentMethod: string;
  cashierName?: string;
  createdAt?: string;
  qrUrl?: string;
}

export const ReceiptK80 = forwardRef<HTMLDivElement, ReceiptK80Props>(
  (
    {
      orderCode,
      customerName = "Khách lẻ",
      customerPhone,
      items,
      subtotal,
      discount,
      total,
      receivedAmount,
      changeAmount = 0,
      paymentMethod,
      cashierName = "Thu ngân BookStock",
      createdAt = new Date().toISOString(),
      qrUrl,
    },
    ref,
  ) => {
    const branding = storeSettingsService.getStoreBranding();

    return (
      <div
        ref={ref}
        className="k80-receipt mx-auto bg-white text-black font-mono text-[12px] leading-tight p-4 w-[80mm] max-w-full shadow-sm print:shadow-none print:w-[80mm] print:p-1"
        style={{ color: "#000" }}
      >
        {/* Header Nhà Sách */}
        <div className="text-center space-y-1 mb-3">
          <h1 className="text-base font-bold uppercase tracking-wider">
            {branding.storeName || "NHÀ SÁCH BOOKSTOCK"}
          </h1>
          <p className="text-[10px] text-gray-700">
            Đ/c: {branding.address || "Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh"}
          </p>
          <p className="text-[10px] text-gray-700">
            Hotline: {branding.hotline || "1900 6868"} • Website:{" "}
            {branding.website || "bookstock.vn"}
          </p>
          <div className="border-b border-dashed border-black my-2" />
          <h2 className="text-sm font-bold uppercase">HÓA ĐƠN THANH TOÁN (POS)</h2>
          <p className="text-[11px]">
            Mã HĐ: <span className="font-bold">{orderCode}</span>
          </p>
          <p className="text-[10px] text-gray-600">{formatDateTime(createdAt)}</p>
        </div>

        {/* Thông tin khách hàng & thu ngân */}
        <div className="text-[11px] space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>Thu ngân:</span>
            <span className="font-semibold">{cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span>Khách hàng:</span>
            <span>
              {customerName} {customerPhone ? `(${customerPhone})` : ""}
            </span>
          </div>
        </div>

        <div className="border-b border-dashed border-black my-2" />

        {/* Danh sách mặt hàng */}
        <table className="w-full text-left text-[11px] mb-2">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1 font-bold">Mặt hàng</th>
              <th className="pb-1 text-center font-bold w-8">SL</th>
              <th className="pb-1 text-right font-bold w-16">Đ.Giá</th>
              <th className="pb-1 text-right font-bold w-20">T.Tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-gray-300">
            {items.map((item, idx) => (
              <tr key={idx} className="py-1">
                <td className="py-1.5 pr-1 font-medium leading-snug">{item.title}</td>
                <td className="py-1.5 text-center">{item.quantity}</td>
                <td className="py-1.5 text-right tabular-nums">{formatCurrency(item.price)}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatCurrency(item.quantity * item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-b border-dashed border-black my-2" />

        {/* Tổng tiền & thanh toán */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Cộng tiền hàng:</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Chiết khấu / Giảm giá:</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-black pt-1 my-1">
            <span>TỔNG CỘNG:</span>
            <span className="tabular-nums text-base">{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-between pt-1">
            <span>Phương thức:</span>
            <span className="font-bold uppercase">{paymentMethod}</span>
          </div>

          {receivedAmount !== undefined && receivedAmount > 0 && (
            <>
              <div className="flex justify-between">
                <span>Tiền khách đưa:</span>
                <span className="tabular-nums">{formatCurrency(receivedAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Tiền thừa trả lại:</span>
                <span className="tabular-nums">{formatCurrency(changeAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* QR Tra cứu / Thanh toán SePay */}
        {qrUrl && (
          <div className="flex flex-col items-center justify-center my-3 text-center">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-28 h-28 object-contain border p-1 rounded"
            />
            <span className="text-[9px] text-gray-500 mt-1">
              Quét mã để thanh toán / tra cứu đơn
            </span>
          </div>
        )}

        <div className="border-b border-dashed border-black my-2" />

        {/* Lời cảm ơn */}
        <div className="text-center space-y-1 text-[10px] text-gray-700 mt-3">
          <p className="font-semibold italic">
            {branding.footerNote || "Xin cảm ơn Quý khách & Hẹn gặp lại!"}
          </p>
          <p>Lưu ý: Quý khách vui lòng kiểm tra lại hóa đơn và hàng hóa trước khi rời quầy.</p>
        </div>
      </div>
    );
  },
);

ReceiptK80.displayName = "ReceiptK80";
