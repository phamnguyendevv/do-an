import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ProductLines, type ProductLine } from "@/components/inventory/product-lines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inventoryService } from "@/services/inventory-service";
import { useOrders } from "@/hooks/use-store";
import { formatNumber } from "@/utils/format";

const reasons = ["Xuất bán theo đơn", "Xuất trả nhà cung cấp", "Hàng lỗi / hủy", "Xuất chuyển kho"];

export const Route = createFileRoute("/inventory/export")({
  head: () => ({
    meta: [
      { title: "Xuất kho — BookStock" },
      {
        name: "description",
        content: "Tạo phiếu xuất kho theo đơn hàng, chọn sản phẩm, số lượng và lý do xuất.",
      },
      { property: "og:title", content: "Xuất kho — BookStock" },
      { property: "og:description", content: "Tạo phiếu xuất kho cho kho sách." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const navigate = useNavigate();
  const orders = useOrders();
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState(reasons[0]!);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ProductLine[]>([{ bookId: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalItems = lines.reduce((s, l) => s + (l.quantity || 0), 0);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const res = await inventoryService.createExport({ orderId, reason, note, lines });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể tạo phiếu xuất.");
      return;
    }
    toast.success(`Đã xuất kho ${res.data!.totalItems} sản phẩm — tồn kho đã cập nhật`);
    navigate({ to: "/inventory" });
  };

  return (
    <AppShell
      requiredAbility={{ action: "create", subject: "ExportReceipt" }}
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kho hàng", href: "/inventory" },
        { label: "Xuất kho" },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/inventory">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại kho hàng
          </Link>
        </Button>

        <PageHeader title="Tạo phiếu xuất kho" description="Ghi nhận hàng xuất khỏi kho." />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Thông tin phiếu</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Đơn hàng liên quan</Label>
                  <Select value={orderId} onValueChange={setOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn hàng (nếu có)" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.slice(0, 12).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.id} — {o.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Lý do xuất <span className="text-destructive">*</span>
                  </Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sản phẩm xuất</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductLines lines={lines} onChange={setLines} checkStock withPrice={false} />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ghi chú thêm cho phiếu xuất..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit shadow-none lg:sticky lg:top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Số dòng sản phẩm</span>
                <span className="font-medium tabular-nums">{lines.length}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-sm">
                <span className="font-medium">Tổng số lượng xuất</span>
                <span className="font-semibold tabular-nums">{formatNumber(totalItems)}</span>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button className="w-full" onClick={submit} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Xác nhận xuất kho"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
