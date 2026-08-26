import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ProductLines, type ProductLine } from "@/components/inventory/product-lines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supplierApi } from "@/lib/supplier-api";
import { inventoryService } from "@/services/inventory-service";
import { formatCurrency, formatNumber } from "@/utils/format";

export const Route = createFileRoute("/inventory/import")({
  head: () => ({
    meta: [
      { title: "Nhập kho — BookStock" },
      { name: "description", content: "Tạo phiếu nhập kho: chọn nhà cung cấp, sản phẩm, số lượng và giá nhập." },
      { property: "og:title", content: "Nhập kho — BookStock" },
      { property: "og:description", content: "Tạo phiếu nhập kho cho kho sách." },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ProductLine[]>([{ bookId: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rawSuppliers = [] } = useQuery({
    queryKey: ["supplier-names"],
    queryFn: async () => {
      try {
        const res = await supplierApi.list({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items.map((s: any) => (typeof s === "string" ? s : s?.name)).filter(Boolean) as string[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const supplierOptions = useMemo(() => {
    if (Array.isArray(rawSuppliers) && rawSuppliers.length > 0) {
      return Array.from(
        new Set(
          rawSuppliers
            .map((s: any) => (typeof s === "string" ? s.trim() : s?.name?.trim()))
            .filter((name): name is string => Boolean(name && name.length > 0)),
        ),
      );
    }
    return [];
  }, [rawSuppliers]);

  const totalItems = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const totalValue = lines.reduce((s, l) => s + (l.quantity || 0) * (l.price || 0), 0);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const res = await inventoryService.createImport({ supplier, date, note, lines });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể tạo phiếu nhập.");
      return;
    }
    toast.success(`Đã nhập kho ${res.data!.totalItems} sản phẩm — tồn kho đã cập nhật`);
    navigate({ to: "/inventory" });
  };

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kho hàng", href: "/inventory" },
        { label: "Nhập kho" },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/inventory">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại kho hàng
          </Link>
        </Button>

        <PageHeader title="Tạo phiếu nhập kho" description="Ghi nhận hàng nhập từ nhà cung cấp." />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Thông tin phiếu</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Nhà cung cấp <span className="text-destructive">*</span>
                  </Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierOptions.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Chưa có nhà cung cấp nào. Vui lòng thêm trong trang Nhà cung cấp.
                        </div>
                      ) : (
                        supplierOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-date">
                    Ngày nhập <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="import-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sản phẩm nhập</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductLines lines={lines} onChange={setLines} priceLabel="Giá nhập" />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ghi chú thêm cho phiếu nhập..."
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng số lượng</span>
                <span className="font-medium tabular-nums">{formatNumber(totalItems)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-sm">
                <span className="font-medium">Tổng giá trị</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalValue)}</span>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button className="w-full" onClick={submit} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Xác nhận nhập kho"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
