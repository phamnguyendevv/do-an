import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { promotionApi, type PromotionApiItem } from "@/lib/promotion-api";

export const Route = createFileRoute("/promotions")({ component: PromotionsPage });
function PromotionsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionApiItem | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    discountType: "PERCENTAGE",
    discountValue: "10",
    minOrderValue: "0",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: `${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16)}`,
  });
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["promotions", search],
    queryFn: () => promotionApi.list({ search, size: 100 }),
  });
  const save = async () => {
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      } as any;
      editing ? await promotionApi.update(editing.id, payload) : await promotionApi.create(payload);
      await client.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Đã lưu khuyến mãi");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu khuyến mãi");
    }
  };
  const columns: DataTableColumn<PromotionApiItem>[] = [
    { key: "code", header: "Mã", cell: (r) => r.code },
    { key: "name", header: "Chương trình", cell: (r) => r.name },
    {
      key: "discountValue",
      header: "Mức giảm",
      cell: (r) =>
        r.discountType === "PERCENTAGE"
          ? `${r.discountValue}%`
          : `${Number(r.discountValue).toLocaleString("vi-VN")} đ`,
    },
    {
      key: "usedCount",
      header: "Đã dùng",
      cell: (r) => `${r.usedCount}${r.usageLimit ? `/${r.usageLimit}` : ""}`,
    },
    { key: "isActive", header: "Trạng thái", cell: (r) => (r.isActive ? "Đang bật" : "Đã tắt") },
    {
      key: "action",
      header: "",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await promotionApi.remove(r.id);
            await client.invalidateQueries({ queryKey: ["promotions"] });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];
  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Khuyến mãi" description="Quản lý mã giảm giá và thời hạn áp dụng">
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm khuyến mãi
          </Button>
        </PageHeader>
        <Input
          className="mb-4"
          placeholder="Tìm mã hoặc tên chương trình"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <DataTable
          columns={columns}
          data={query.data?.data || []}
          rowKey={(r) => String(r.id)}
          loading={query.isLoading}
        />
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg space-y-3 rounded-lg bg-background p-6">
              <h2 className="text-lg font-semibold">
                {editing ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}
              </h2>
              {(
                ["code", "name", "discountValue", "minOrderValue", "startsAt", "endsAt"] as const
              ).map((k) => (
                <Input
                  key={k}
                  placeholder={k}
                  type={k.includes("At") ? "datetime-local" : "text"}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              ))}
              <select
                className="h-9 w-full rounded-md border bg-background px-3"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              >
                <option value="PERCENTAGE">Phần trăm</option>
                <option value="FIXED">Số tiền</option>
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={save}>Lưu</Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
