import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orderApi } from "@/lib/order-api";
import { storeSettingsService } from "@/services/store-settings";
import { formatCurrency } from "@/utils/format";
import type { Order } from "@/types";

import { usePaymentSocket } from "@/hooks/use-payment-socket";

interface SepayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPaymentSuccess?: () => void;
}

export function SepayPaymentDialog({
  open,
  onOpenChange,
  order,
  onPaymentSuccess,
}: SepayPaymentDialogProps) {
  const [isPaid, setIsPaid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const sepayConfig = storeSettingsService.getSepayConfig();
  const orderCode = order?.id || (order as any)?.orderCode || "";
  const total = Number(order?.total || 0);

  const qrUrl = storeSettingsService.getSepayQrUrl(total, orderCode);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}!`);
    }
  };

  // Real-time WebSocket payment listener (No more polling!)
  usePaymentSocket({
    orderCode: String(orderCode),
    enabled: open && !isPaid,
    onPaymentSuccess: (event) => {
      setIsPaid(true);
      toast.success(
        `🎉 Đã nhận thanh toán ${formatCurrency(event.amount || total)} cho đơn ${orderCode} qua SePay!`,
      );
      onPaymentSuccess?.();
    },
  });

  const handleManualCheck = async () => {
    if (!order) return;
    setIsChecking(true);
    try {
      const freshOrder = await orderApi.get(orderCode);
      if (freshOrder && freshOrder.payment === "PAID") {
        setIsPaid(true);
        toast.success("Đơn hàng đã được xác nhận thanh toán thành công!");
        onPaymentSuccess?.();
      } else {
        toast.info("Chưa nhận được biến động thanh toán. Vui lòng thử lại sau vài giây.");
      }
    } catch {
      toast.error("Không thể kiểm tra trạng thái đơn hàng.");
    } finally {
      setIsChecking(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-5 w-5 text-primary" /> Thanh toán Chuyển khoản SePay VietQR
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quét mã QR bằng ứng dụng ngân hàng bất kỳ để chuyển khoản trực tiếp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-center">
          {/* QR Code Container */}
          <div className="relative mx-auto inline-block bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
            <img
              src={qrUrl}
              alt={`Mã VietQR ${orderCode}`}
              className="w-52 h-52 object-contain mx-auto rounded"
            />
            {isPaid && (
              <div className="absolute inset-0 bg-emerald-600/95 rounded-xl flex flex-col items-center justify-center text-white font-bold p-4 animate-in fade-in zoom-in-95">
                <Check className="h-12 w-12 text-white stroke-[3] mb-1" />
                <span className="text-base uppercase tracking-wider">ĐÃ THANH TOÁN</span>
                <span className="text-xs font-normal opacity-90 mt-0.5">
                  Đơn hàng {orderCode} đã hoàn tất
                </span>
              </div>
            )}
          </div>

          {/* Account & Transfer Info */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-left space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-muted-foreground">Ngân hàng:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">{sepayConfig.bank}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => copyToClipboard(sepayConfig.bank, "Tên ngân hàng")}
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-muted-foreground">Số tài khoản (STK):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground text-sm">
                  {sepayConfig.accountNumber}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => copyToClipboard(sepayConfig.accountNumber, "Số tài khoản")}
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-muted-foreground">Chủ tài khoản:</span>
              <span className="font-bold text-primary">{sepayConfig.accountName}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-muted-foreground">Số tiền:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-primary tabular-nums">
                  {formatCurrency(total)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => copyToClipboard(String(total), "Số tiền")}
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {orderCode}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => copyToClipboard(orderCode, "Nội dung chuyển khoản")}
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Hệ thống tự động kích hoạt ngay khi ngân hàng báo nhận tiền.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualCheck}
            disabled={isChecking || isPaid}
            className="text-xs"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang kiểm tra...
              </>
            ) : (
              "Kiểm tra giao dịch"
            )}
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
