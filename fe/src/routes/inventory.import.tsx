import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
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
import { useBooks } from "@/hooks/use-store";
import { supplierApi, type SupplierApiItem } from "@/lib/supplier-api";
import { inventoryService } from "@/services/inventory-service";
import { downloadInventoryImportTemplate, parseInventoryImportFile } from "@/lib/excel-service";
import { formatCurrency, formatNumber } from "@/utils/format";

export const Route = createFileRoute("/inventory/import")({
  head: () => ({
    meta: [
      { title: "Nhập kho — BookStock" },
      {
        name: "description",
        content: "Tạo phiếu nhập kho: chọn nhà cung cấp, sản phẩm, số lượng và giá nhập.",
      },
      { property: "og:title", content: "Nhập kho — BookStock" },
      { property: "og:description", content: "Tạo phiếu nhập kho cho kho sách." },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const books = useBooks();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ProductLine[]>([{ bookId: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);

  const { data: suppliersList = [] } = useQuery({
    queryKey: ["suppliers", "list-all"],
    queryFn: async () => {
      try {
        const res = await supplierApi.list({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items as SupplierApiItem[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const selectedSupplier = useMemo(() => {
    return suppliersList.find((s) => String(s.id) === selectedSupplierId);
  }, [suppliersList, selectedSupplierId]);

  const totalItems = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const totalValue = lines.reduce((s, l) => s + (l.quantity || 0) * (l.price || 0), 0);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data, errors } = await parseInventoryImportFile(file);
      if (errors.length > 0) {
        toast.warning(`File Excel có một số lưu ý: ${errors[0]}`);
      }

      if (data.length === 0) {
        toast.error("Không tìm thấy dòng sản phẩm hợp lệ trong file Excel.");
        return;
      }

      const newLines: ProductLine[] = [];
      for (const row of data) {
        // Find matching book in system
        const matched = books.find(
          (b) =>
            b.id === row.bookIdOrTitle ||
            b.title.toLowerCase().trim() === row.bookIdOrTitle.toLowerCase().trim() ||
            (b.isbn && b.isbn === row.bookIdOrTitle),
        );

        if (matched) {
          newLines.push({
            bookId: matched.id,
            quantity: row.quantity,
            price: row.price > 0 ? row.price : matched.purchasePrice || matched.price * 0.7,
          });
        }
      }

      if (newLines.length > 0) {
        setLines(newLines);
        toast.success(`Đã nhập ${newLines.length} sản phẩm từ file Excel thành công!`);
      } else {
        toast.error("Không khớp được sản phẩm nào trong hệ thống với file Excel.");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi đọc file Excel");
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!selectedSupplier) {
      setError("Vui lòng chọn nhà cung cấp.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await inventoryService.createImport({
      supplier: selectedSupplier.name,
      supplierId:
        typeof selectedSupplier.id === "number"
          ? selectedSupplier.id
          : parseInt(String(selectedSupplier.id), 10),
      date,
      note,
      lines,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể tạo phiếu nhập.");
      return;
    }
    toast.success(
      `Đã tạo phiếu nhập ${res.data!.id} (${res.data!.totalItems} cuốn) — tồn kho đã cập nhật!`,
    );
    navigate({ to: "/inventory" });
  };

  return (
    <AppShell
      requiredAbility={{ action: "create", subject: "ImportReceipt" }}
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

        <PageHeader
          title="Tạo phiếu nhập kho"
          description="Ghi nhận hàng nhập từ nhà cung cấp vào cơ sở dữ liệu và sổ kho."
          actions={
            <div className="flex gap-2">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={downloadInventoryImportTemplate}>
                <Download className="mr-1.5 h-4 w-4" /> File mẫu (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={() => excelInputRef.current?.click()}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Nhập từ Excel
              </Button>
            </div>
          }
        />

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
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliersList.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Chưa có nhà cung cấp nào. Vui lòng thêm trong trang Nhà cung cấp.
                        </div>
                      ) : (
                        suppliersList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
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
              <CardTitle className="text-base">Tổng kết phiếu nhập</CardTitle>
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
                <span className="font-medium">Tổng giá trị nhập</span>
                <span className="font-semibold tabular-nums text-primary">
                  {formatCurrency(totalValue)}
                </span>
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
