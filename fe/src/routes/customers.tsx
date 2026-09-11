import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerApi, type CustomerApiItem } from "@/lib/customer-api";

export const Route = createFileRoute("/customers")({ component: CustomersPage });

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerApiItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerApi.list({ search, size: 100 }),
  });
  const open = (customer?: CustomerApiItem) => {
    setEditing(customer || null);
    setDialogOpen(true);
    setForm(
      customer
        ? {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || "",
            address: customer.address || "",
            note: customer.note || "",
          }
        : { name: "", phone: "", email: "", address: "", note: "" },
    );
  };
  const save = async () => {
    try {
      editing ? await customerApi.update(editing.id, form) : await customerApi.create(form);
      await client.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã lưu khách hàng");
      setEditing(null);
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu khách hàng");
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Xóa khách hàng này?")) return;
    try {
      await customerApi.remove(id);
      await client.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã xóa khách hàng");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể xóa");
    }
  };
  const columns: DataTableColumn<CustomerApiItem>[] = [
    {
      key: "name",
      header: "Khách hàng",
      cell: (row) => (
        <button className="text-left font-medium hover:underline" onClick={() => open(row)}>
          {row.name}
        </button>
      ),
    },
    { key: "phone", header: "Số điện thoại", cell: (row) => row.phone },
    { key: "email", header: "Email", cell: (row) => row.email || "-" },
    { key: "totalOrders", header: "Đơn hàng", cell: (row) => row.totalOrders },
    {
      key: "totalSpent",
      header: "Tổng mua",
      cell: (row) => `${Number(row.totalSpent).toLocaleString("vi-VN")} đ`,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Button variant="ghost" size="icon" onClick={() => remove(row.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];
  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Khách hàng" description="Quản lý thông tin và lịch sử mua hàng">
          <Button onClick={() => open()}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm khách hàng
          </Button>
        </PageHeader>
        <div className="mb-4 flex gap-2">
          <Search className="mt-2 h-4 w-4" />
          <Input
            placeholder="Tìm tên, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={query.data?.data || []}
          rowKey={(row) => String(row.id)}
          loading={query.isLoading}
        />
        <>
          {dialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-lg space-y-3 rounded-lg bg-background p-6">
                <h2 className="text-lg font-semibold">
                  {editing ? "Sửa khách hàng" : "Thêm khách hàng"}
                </h2>
                {(["name", "phone", "email", "address", "note"] as const).map((key) => (
                  <Input
                    key={key}
                    placeholder={key}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ))}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={save}>Lưu</Button>
                </div>
              </div>
            </div>
          )}
        </>
      </PageContainer>
    </AppShell>
  );
}
