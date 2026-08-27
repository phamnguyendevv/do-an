import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Plus,
  Scale,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useBooks } from "@/hooks/use-store";
import { inventoryApi, type StockAuditApiItem } from "@/lib/inventory-api";
import { exportBooksToExcel } from "@/lib/excel-service";
import { formatDateTime, formatNumber } from "@/utils/format";
import { Can } from "@/lib/ability";

export const Route = createFileRoute("/inventory/audit")({
  head: () => ({
    meta: [
      { title: "Kiểm kê kho — BookStock" },
      { name: "description", content: "Kiểm đếm tồn kho thực tế, đối soát chênh lệch và cân bằng sổ kho." },
    ],
  }),
  component: StockAuditPage,
});

interface AuditDraftLine {
  bookId: number;
  title: string;
  systemStock: number;
  actualStock: number;
  reason: string;
}

function CreateAuditDialog({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const books = useBooks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Kiểm kê kho định kỳ ${new Date().toLocaleDateString("vi-VN")}`);
  const [note, setNote] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [draftLines, setDraftLines] = useState<AuditDraftLine[]>([]);

  // Initialize draft lines from current books when dialog opens
  const initializeLines = () => {
    setDraftLines(
      books.map((b) => ({
        bookId: parseInt(b.id, 10) || 0,
        title: b.title,
        systemStock: b.stock,
        actualStock: b.stock,
        reason: "",
      })),
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) initializeLines();
    setOpen(nextOpen);
  };

  const updateActualStock = (bookId: number, val: number) => {
    setDraftLines((prev) =>
      prev.map((l) => (l.bookId === bookId ? { ...l, actualStock: Math.max(0, val) } : l)),
    );
  };

  const updateReason = (bookId: number, val: string) => {
    setDraftLines((prev) =>
      prev.map((l) => (l.bookId === bookId ? { ...l, reason: val } : l)),
    );
  };

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      return await inventoryApi.createAudit({
        title,
        note,
        auditDate: new Date().toISOString(),
        items: draftLines.map((l) => ({
          bookId: l.bookId,
          title: l.title,
          systemStock: l.systemStock,
          actualStock: l.actualStock,
          reason: l.reason || undefined,
        })),
      });
    },
    onSuccess: () => {
      toast.success("Tạo phiếu kiểm kê kho thành công!");
      queryClient.invalidateQueries({ queryKey: ["inventory", "audits"] });
      setOpen(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi tạo phiếu kiểm kê");
    },
  });

  const filteredLines = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return draftLines;
    return draftLines.filter((l) => l.title.toLowerCase().includes(q) || String(l.bookId).includes(q));
  }, [draftLines, searchFilter]);

  const totalDiffCount = useMemo(
    () => draftLines.filter((l) => l.actualStock !== l.systemStock).length,
    [draftLines],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Tạo phiếu kiểm kê
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Tạo phiếu kiểm kê tồn kho mới
          </DialogTitle>
          <DialogDescription>
            Nhập số lượng thực tế đếm được trong kho để đối chiếu với số liệu hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-2">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
            <div className="space-y-1.5">
              <Label htmlFor="atitle">Tiêu đề đợt kiểm kê</Label>
              <Input
                id="atitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kiểm kê kho cuối tháng 8"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anote">Ghi chú / Đợt kiểm</Label>
              <Input
                id="anote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Kiểm tra khu vực kệ tiểu thuyết"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Quick Search & Summary */}
          <div className="flex items-center justify-between gap-3 shrink-0 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm sách trong bảng kiểm kê..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Tổng <strong>{draftLines.length}</strong> đầu sách • Có{" "}
              <strong className={totalDiffCount > 0 ? "text-amber-600 font-bold" : "text-emerald-600"}>
                {totalDiffCount}
              </strong>{" "}
              đầu sách bị chênh lệch
            </span>
          </div>

          {/* Table of items */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted sticky top-0 border-b z-10">
                <tr>
                  <th className="p-2 w-12">#</th>
                  <th className="p-2">Tên sách</th>
                  <th className="p-2 text-right w-24">Tồn HT</th>
                  <th className="p-2 text-right w-28">Thực tế</th>
                  <th className="p-2 text-center w-24">Chênh lệch</th>
                  <th className="p-2 w-48">Lý do chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLines.map((line, idx) => {
                  const diff = line.actualStock - line.systemStock;
                  const hasDiff = diff !== 0;

                  return (
                    <tr key={line.bookId} className={`hover:bg-muted/40 ${hasDiff ? "bg-amber-500/5" : ""}`}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{line.title}</td>
                      <td className="p-2 text-right font-semibold tabular-nums">{line.systemStock}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          value={line.actualStock}
                          onChange={(e) => updateActualStock(line.bookId, Number(e.target.value))}
                          className="h-7 w-20 text-right ml-auto text-xs font-bold"
                        />
                      </td>
                      <td className="p-2 text-center font-bold tabular-nums">
                        {diff === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              diff > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <Input
                          value={line.reason}
                          onChange={(e) => updateReason(line.bookId, e.target.value)}
                          placeholder={hasDiff ? "Lý do lệch..." : ""}
                          className="h-7 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Đang lưu..." : "Lưu phiếu kiểm kê (DRAFT)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailAuditDialog({
  audit,
  trigger,
}: {
  audit: StockAuditApiItem;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmBalanceOpen, setConfirmBalanceOpen] = useState(false);
  const queryClient = useQueryClient();

  const balanceMutation = useMutation({
    mutationFn: async () => {
      return await inventoryApi.balanceAudit(audit.id);
    },
    onSuccess: () => {
      toast.success(`Đã cân bằng kho thành công theo phiếu ${audit.auditCode}! Tồn kho và Sổ kho đã cập nhật.`);
      queryClient.invalidateQueries({ queryKey: ["inventory", "audits"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setConfirmBalanceOpen(false);
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi cân bằng kho");
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Chi tiết phiếu kiểm kê {audit.auditCode}
            </DialogTitle>
            <DialogDescription>
              {audit.title} • Ngày kiểm: {formatDateTime(audit.auditDate)} • Người kiểm: {audit.auditedBy}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
              <div>
                <p className="text-muted-foreground">Tổng tồn HT:</p>
                <p className="text-base font-bold tabular-nums">{formatNumber(audit.totalSystemStock)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tổng thực tế:</p>
                <p className="text-base font-bold tabular-nums">{formatNumber(audit.totalActualStock)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tổng chênh lệch:</p>
                <p
                  className={`text-base font-bold tabular-nums ${
                    audit.totalDiff === 0
                      ? "text-muted-foreground"
                      : audit.totalDiff > 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                  }`}
                >
                  {audit.totalDiff > 0 ? `+${audit.totalDiff}` : audit.totalDiff} cuốn
                </p>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="p-2">Tên sách</th>
                    <th className="p-2 text-right">Tồn HT</th>
                    <th className="p-2 text-right">Thực tế</th>
                    <th className="p-2 text-center">Lệch</th>
                    <th className="p-2">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(audit.items || []).map((item, i) => (
                    <tr
                      key={i}
                      className={item.diffQuantity !== 0 ? "bg-amber-500/5 font-medium" : ""}
                    >
                      <td className="p-2">{item.title}</td>
                      <td className="p-2 text-right tabular-nums">{item.systemStock}</td>
                      <td className="p-2 text-right font-semibold tabular-nums">{item.actualStock}</td>
                      <td className="p-2 text-center tabular-nums font-bold">
                        {item.diffQuantity === 0 ? (
                          "—"
                        ) : (
                          <span
                            className={item.diffQuantity > 0 ? "text-emerald-600" : "text-rose-600"}
                          >
                            {item.diffQuantity > 0 ? `+${item.diffQuantity}` : item.diffQuantity}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">{item.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge tone={audit.status === "BALANCED" ? "positive" : "warning"}>
                {audit.status === "BALANCED" ? "Đã cân bằng kho" : "Bản nháp (Chưa cân bằng)"}
              </StatusBadge>
              {audit.balancedAt && (
                <span className="text-xs text-muted-foreground">
                  (Cân bằng lúc: {formatDateTime(audit.balancedAt)})
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Đóng
              </Button>
              {audit.status === "DRAFT" && (
                <Button onClick={() => setConfirmBalanceOpen(true)}>
                  <Scale className="mr-1.5 h-4 w-4" /> Cân bằng kho ngay
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmBalanceOpen}
        onOpenChange={setConfirmBalanceOpen}
        title="Xác nhận Cân bằng kho?"
        description={`Hệ thống sẽ cập nhật lại số lượng tồn kho của toàn bộ sách theo số lượng thực tế trong phiếu ${audit.auditCode}, và tự động ghi log vào Sổ kho (StockMovement) với loại ADJUST.`}
        confirmLabel="Xác nhận Cân bằng"
        onConfirm={() => balanceMutation.mutate()}
      />
    </>
  );
}

function StockAuditPage() {
  const [search, setSearch] = useState("");
  const books = useBooks();

  const { data: auditsData, refetch } = useQuery({
    queryKey: ["inventory", "audits"],
    queryFn: async () => {
      try {
        const res = await inventoryApi.listAudits({ size: 100 });
        return res?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10_000,
  });

  const audits = auditsData || [];

  const filteredAudits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return audits;
    return audits.filter(
      (a) =>
        a.auditCode.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.auditedBy.toLowerCase().includes(q),
    );
  }, [audits, search]);

  const columns: DataTableColumn<StockAuditApiItem>[] = [
    {
      key: "auditCode",
      header: "Mã phiếu",
      sortable: true,
      value: (a) => a.auditCode,
      cell: (a) => (
        <DetailAuditDialog
          audit={a}
          trigger={
            <button className="font-mono text-xs font-semibold text-primary hover:underline">
              {a.auditCode}
            </button>
          }
        />
      ),
    },
    {
      key: "title",
      header: "Tiêu đề đợt kiểm kê",
      sortable: true,
      value: (a) => a.title,
      cell: (a) => <span className="font-medium text-xs">{a.title}</span>,
    },
    {
      key: "auditDate",
      header: "Ngày kiểm kê",
      sortable: true,
      value: (a) => a.auditDate,
      cell: (a) => <span className="text-xs text-muted-foreground">{formatDateTime(a.auditDate)}</span>,
    },
    {
      key: "stats",
      header: "Tồn: HT / Thực tế",
      align: "center",
      cell: (a) => (
        <span className="tabular-nums text-xs">
          {formatNumber(a.totalSystemStock)} / <strong className="text-foreground">{formatNumber(a.totalActualStock)}</strong>
        </span>
      ),
    },
    {
      key: "diff",
      header: "Chênh lệch",
      align: "right",
      sortable: true,
      value: (a) => a.totalDiff,
      cell: (a) => {
        const isDiff = a.totalDiff !== 0;
        return (
          <span
            className={`tabular-nums font-bold text-xs ${
              !isDiff
                ? "text-muted-foreground"
                : a.totalDiff > 0
                  ? "text-emerald-600"
                  : "text-rose-600"
            }`}
          >
            {a.totalDiff > 0 ? `+${a.totalDiff}` : a.totalDiff}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (a) => (
        <StatusBadge tone={a.status === "BALANCED" ? "positive" : "warning"}>
          {a.status === "BALANCED" ? "Đã cân bằng" : "Bản nháp"}
        </StatusBadge>
      ),
    },
    {
      key: "auditedBy",
      header: "Người thực hiện",
      cell: (a) => <span className="text-xs text-muted-foreground">{a.auditedBy}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      cell: (a) => (
        <DetailAuditDialog
          audit={a}
          trigger={
            <Button size="sm" variant={a.status === "DRAFT" ? "default" : "outline"} className="h-7 text-xs">
              {a.status === "DRAFT" ? (
                <>
                  <Scale className="mr-1 h-3.5 w-3.5" /> Cân bằng
                </>
              ) : (
                "Xem chi tiết"
              )}
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <AppShell
      requiredAbility={{ action: "read", subject: "StockMovement" }}
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kho hàng", href: "/inventory" },
        { label: "Kiểm kê kho" },
      ]}
    >
      <PageContainer>
        <PageHeader
          title="Kiểm kê kho & Cân bằng tồn kho"
          description="Lập phiếu kiểm kê, phát hiện chênh lệch tồn kho và tự động cập nhật cân bằng sổ kho."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/inventory">
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Về Kho hàng
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportBooksToExcel(books, "bang_kiem_ke_kho")}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Excel kiểm kê
              </Button>
              <Can I="create" a="StockMovement">
                <CreateAuditDialog onSuccess={() => refetch()} />
              </Can>
            </div>
          }
        />

        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredAudits}
            rowKey={(a) => a.id}
            emptyTitle="Chưa có phiếu kiểm kê kho nào. Nhấn 'Tạo phiếu kiểm kê' để bắt đầu đợt kiểm đếm mới."
          />
        </div>
      </PageContainer>
    </AppShell>
  );
}
