import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/format";
import { inventoryService } from "@/services/inventory-service";
import { orderService } from "@/services/order-service";
import type { PendingAction } from "@/services/assistant-tools";

const titleOf = (a: PendingAction) =>
  a.kind === "create_order"
    ? "Tạo đơn hàng"
    : a.kind === "import"
      ? "Phiếu nhập kho"
      : a.kind === "export"
        ? "Phiếu xuất kho"
        : "Điều hướng";

export function ActionPreview({ action }: { action: PendingAction }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (action.kind === "navigate") {
    return (
      <Card className="border-primary/40">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <p className="text-sm">{action.label}</p>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: action.path })}>
            Mở <ArrowRight className="ml-1 size-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const blocked = action.lines.length === 0;

  async function confirm() {
    if (action.kind === "navigate") return;
    setBusy(true);
    try {
      if (action.kind === "create_order") {
        const res = await orderService.createOrder({
          customerName: action.customerName,
          customerPhone: action.customerPhone || "0000000000",
          customerAddress: action.customerAddress,
          shippingMethod: "Giao hàng tiêu chuẩn",
          shippingFee: 0,
          discount: 0,
          lines: action.lines.map((l) => ({
            bookId: l.bookId,
            quantity: l.quantity,
            price: l.price,
          })),
        });
        if (!res.ok) {
          toast.error(res.error ?? "Không tạo được đơn hàng.");
          return;
        }
        toast.success(`Đã tạo đơn ${res.data?.id}`);
        setDone(`Đã tạo đơn hàng ${res.data?.id}.`);
      } else if (action.kind === "import") {
        const res = await inventoryService.createImport({
          supplier: action.supplier || "Nhà cung cấp khác",
          date: new Date().toISOString(),
          note: action.note,
          lines: action.lines.map((l) => ({
            bookId: l.bookId,
            quantity: l.quantity,
            price: l.price,
          })),
        });
        if (!res.ok) {
          toast.error(res.error ?? "Không tạo được phiếu nhập.");
          return;
        }
        toast.success(`Đã tạo phiếu nhập ${res.data?.id}`);
        setDone(`Đã tạo phiếu nhập ${res.data?.id}.`);
      } else {
        const res = await inventoryService.createExport({
          orderId: action.orderId,
          reason: action.reason,
          lines: action.lines.map((l) => ({
            bookId: l.bookId,
            quantity: l.quantity,
            price: l.price,
          })),
        });
        if (!res.ok) {
          toast.error(res.error ?? "Không tạo được phiếu xuất.");
          return;
        }
        toast.success(`Đã tạo phiếu xuất ${res.data?.id}`);
        setDone(`Đã tạo phiếu xuất ${res.data?.id}.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{titleOf(action)} — cần bạn xác nhận</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {action.kind === "create_order" && (
          <div className="text-muted-foreground">
            <p>
              Khách hàng:{" "}
              <span className="text-foreground font-medium">{action.customerName || "—"}</span>
            </p>
            {action.customerPhone ? <p>SĐT: {action.customerPhone}</p> : null}
            {action.customerAddress ? <p>Địa chỉ: {action.customerAddress}</p> : null}
          </div>
        )}
        {action.kind === "import" && (
          <p className="text-muted-foreground">
            Nhà cung cấp: <span className="text-foreground">{action.supplier || "—"}</span>
          </p>
        )}
        {action.kind === "export" && (
          <p className="text-muted-foreground">
            Lý do: <span className="text-foreground">{action.reason}</span>
          </p>
        )}

        <Separator />
        <ul className="space-y-1">
          {action.lines.map((l) => (
            <li key={l.bookId} className="flex justify-between gap-3">
              <span className="truncate">{l.title}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                × {l.quantity} · {formatCurrency(l.price * l.quantity)}
              </span>
            </li>
          ))}
          {blocked ? (
            <li className="text-muted-foreground">Không có dòng sản phẩm hợp lệ.</li>
          ) : null}
        </ul>

        {action.kind !== "export" && (
          <div className="flex justify-between font-semibold">
            <span>Tổng</span>
            <span>{formatCurrency(action.total)}</span>
          </div>
        )}

        {action.warnings.length > 0 && (
          <div className="flex gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <ul className="space-y-1">
              {action.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {done ? (
          <p className="text-sm font-medium text-success">{done}</p>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDone("Đã hủy thao tác.")}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button size="sm" onClick={confirm} disabled={busy || blocked}>
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Xác nhận
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
