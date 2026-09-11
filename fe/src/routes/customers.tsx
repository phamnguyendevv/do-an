import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Trash2, X, Calendar, Phone, Mail, MapPin, ShoppingBag, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerApi, type CustomerApiItem } from "@/lib/customer-api";
import { orderApi } from "@/lib/order-api";

export const Route = createFileRoute("/customers")({ component: CustomersPage });

function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [editing, setEditing] = useState<CustomerApiItem | null>(null);
  const [viewing, setViewing] = useState<CustomerApiItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const client = useQueryClient();
  
  const query = useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerApi.list({ search, size: 100 }),
    enabled: search !== "", // Chỉ chạy khi search không rỗng
    staleTime: 0, // Always treat as stale to force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: true, // Always refetch on mount
  });

  // Query orders by customer phone
  const ordersQuery = useQuery({
    queryKey: ["customer-orders", viewing?.phone],
    queryFn: () => orderApi.list({ search: viewing?.phone, size: 100 }),
    enabled: !!viewing?.phone,
    staleTime: 0, // Always treat as stale to force fresh data
  });

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
  };

  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !quickAddPhone.trim()) {
      toast.error("Vui lòng nhập tên và số điện thoại");
      return;
    }

    setIsQuickAdding(true);
    try {
      // Normalize phone before saving
      const normalizedPhone = quickAddPhone.replace(/\D/g, '').replace(/^84/, '0');
      await customerApi.create({
        name: quickAddName,
        phone: normalizedPhone,
      });
      await client.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Đã thêm khách hàng ${quickAddName}`);
      setQuickAddName("");
      setQuickAddPhone("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể thêm khách hàng");
    } finally {
      setIsQuickAdding(false);
    }
  };
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

  const viewDetails = (customer: CustomerApiItem) => {
    setViewing(customer);
    setDetailOpen(true);
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
        <button className="text-left font-medium hover:underline text-blue-600" onClick={() => viewDetails(row)}>
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
      key: "lastOrderAt",
      header: "Mua lần cuối",
      cell: (row) =>
        row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString("vi-VN") : "-",
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

        {/* Quick Add Section */}
        <div className="mb-6 p-4 border rounded-lg bg-blue-50 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            Đăng ký khách hàng nhanh
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input
              placeholder="Tên khách hàng"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="bg-white"
            />
            <Input
              placeholder="SĐT (bắt buộc)"
              value={quickAddPhone}
              onChange={(e) => setQuickAddPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="bg-white"
            />
            <Button
              onClick={handleQuickAdd}
              disabled={isQuickAdding || !quickAddName.trim() || !quickAddPhone.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isQuickAdding ? "Đang thêm..." : "Thêm"}
            </Button>
            {(quickAddName || quickAddPhone) && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuickAddName("");
                  setQuickAddPhone("");
                }}
              >
                Xóa
              </Button>
            )}
          </div>
          <p className="text-xs text-blue-600">
            💡 Tip: Chỉ cần nhập tên + SĐT, rồi sau khi bán hàng tại POS sẽ auto-save toàn bộ.
          </p>
        </div>
        <div className="mb-4 flex gap-2">
          <Search className="mt-2 h-4 w-4" />
          <Input
            placeholder="Nhập tên hoặc số điện thoại khách hàng..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} className="gap-2">
            <Search className="h-4 w-4" />
            Tra cứu
          </Button>
          {searchInput && (
            <Button variant="outline" onClick={handleClear}>
              Xóa
            </Button>
          )}
        </div>
        
        {search === "" ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>💡 Nhập tên hoặc SĐT khách hàng rồi nhấn "Tra cứu"</p>
          </div>
        ) : query.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Đang tải dữ liệu khách hàng...</p>
          </div>
        ) : query.isError ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            <div className="text-center space-y-2">
              <p className="font-semibold">Lỗi tải dữ liệu</p>
              <p>{query.error?.message || "Không thể tải danh sách khách hàng"}</p>
              <p className="text-xs text-muted-foreground">
                {JSON.stringify(query.error)}
              </p>
            </div>
          </div>
        ) : query.isSuccess ? (
          <>
            <div className="mb-3 text-sm text-muted-foreground">
              Tìm thấy: {query.data?.data?.length || 0} khách hàng
            </div>
            {(!query.data?.data || query.data.data.length === 0) ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Không tìm thấy khách hàng nào</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={query.data.data}
                rowKey={(row) => String(row.id)}
                loading={query.isLoading}
              />
            )}
          </>
        ) : null}
        
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

          {detailOpen && viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{viewing.name}</h2>
                    <p className="text-sm text-muted-foreground">Chi tiết khách hàng</p>
                  </div>
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Số điện thoại</p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {viewing.phone}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {viewing.email || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Địa chỉ</p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {viewing.address || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú</p>
                    <p>{viewing.note || "-"}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 bg-muted/50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="flex justify-center mb-1">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{viewing.totalOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Tổng đơn</p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-1">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold">
                      {Number(viewing.totalSpent || 0).toLocaleString("vi-VN", {
                        notation: "compact",
                        compactDisplay: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">Tổng chi</p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-1">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold">
                      {viewing.lastOrderAt
                        ? new Date(viewing.lastOrderAt).toLocaleDateString("vi-VN")
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Mua lần cuối</p>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h3 className="font-semibold mb-3">Lịch sử mua hàng</h3>
                  {ordersQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                  ) : ordersQuery.data?.data && ordersQuery.data.data.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ordersQuery.data.data.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-sm">{order.orderCode}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {Number(order.total).toLocaleString("vi-VN")} đ
                            </p>
                            <p className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              {order.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa có đơn hàng nào
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailOpen(false);
                      open(viewing);
                    }}
                  >
                    Sửa thông tin
                  </Button>
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      </PageContainer>
    </AppShell>
  );
}
