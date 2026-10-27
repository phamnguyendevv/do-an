import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  Loader2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerApi, type CustomerApiItem } from "@/lib/customer-api";
import { orderApi } from "@/lib/order-api";

export const Route = createFileRoute("/customers")({ component: CustomersPage });

function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<CustomerApiItem | null>(null);
  const [viewing, setViewing] = useState<CustomerApiItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      customerApi.list({
        ...(search.trim() ? { search: search.trim() } : {}),
        size: 100,
      }),
    staleTime: 5000,
  });

  // Query orders by customer phone
  const ordersQuery = useQuery({
    queryKey: ["customer-orders", viewing?.phone],
    queryFn: () =>
      orderApi.list({ ...(viewing?.phone ? { search: viewing.phone } : {}), size: 100 }),
    enabled: !!viewing?.phone && detailOpen,
    staleTime: 0,
  });

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
  };

  const handleQuickAdd = async () => {
    const name = quickAddName.trim();
    const phone = quickAddPhone.replace(/\D/g, "").replace(/^84/, "0");

    if (!name) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (ít nhất 9 số)");
      return;
    }

    setIsQuickAdding(true);
    try {
      await customerApi.create({
        name,
        phone,
      });
      await client.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Đã thêm khách hàng ${name} thành công`);
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
    setDialogOpen(true);
  };

  const viewDetails = (customer: CustomerApiItem) => {
    setViewing(customer);
    setDetailOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "").replace(/^84/, "0");
    const email = form.email.trim();
    const address = form.address.trim();
    const note = form.note.trim();

    if (!name) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (ít nhất 9 số)");
      return;
    }

    const payload: Partial<CustomerApiItem> = {
      name,
      phone,
      ...(email ? { email } : {}),
      ...(address ? { address } : {}),
      ...(note ? { note } : {}),
    };

    setIsSaving(true);
    try {
      if (editing) {
        await customerApi.update(editing.id, payload);
        toast.success(`Đã cập nhật khách hàng ${name}`);
      } else {
        await customerApi.create(payload);
        toast.success(`Đã thêm khách hàng ${name} thành công`);
      }
      await client.invalidateQueries({ queryKey: ["customers"] });
      setEditing(null);
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu thông tin khách hàng");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) return;
    try {
      await customerApi.remove(id);
      await client.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã xóa khách hàng thành công");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể xóa khách hàng");
    }
  };

  const columns: DataTableColumn<CustomerApiItem>[] = [
    {
      key: "name",
      header: "Khách hàng",
      cell: (row) => (
        <button
          className="text-left font-medium hover:underline text-primary"
          onClick={() => viewDetails(row)}
        >
          {row.name}
        </button>
      ),
    },
    { key: "phone", header: "Số điện thoại", cell: (row) => row.phone },
    { key: "email", header: "Email", cell: (row) => row.email || "-" },
    {
      key: "address",
      header: "Địa chỉ",
      cell: (row) => (
        <span className="max-w-[200px] truncate block text-muted-foreground" title={row.address}>
          {row.address || "-"}
        </span>
      ),
    },
    {
      key: "totalOrders",
      header: "Đơn hàng",
      cell: (row) => row.totalOrders ?? 0,
    },
    {
      key: "totalSpent",
      header: "Tổng mua",
      cell: (row) => `${Number(row.totalSpent || 0).toLocaleString("vi-VN")} đ`,
    },
    {
      key: "lastOrderAt",
      header: "Mua lần cuối",
      cell: (row) =>
        row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString("vi-VN") : "-",
    },
    {
      key: "actions",
      header: "Thao tác",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => open(row)}
            title="Chỉnh sửa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            onClick={() => remove(row.id)}
            title="Xóa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Khách hàng"
          description="Quản lý thông tin liên hệ và lịch sử giao dịch khách hàng"
        >
          <Button onClick={() => open()} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm khách hàng
          </Button>
        </PageHeader>

        {/* Quick Add Section */}
        <div className="mb-6 p-4 border rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-300">
            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Đăng ký khách hàng nhanh
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <Input
              placeholder="Họ và tên khách hàng *"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="bg-background"
            />
            <Input
              placeholder="Số điện thoại *"
              value={quickAddPhone}
              onChange={(e) => setQuickAddPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="bg-background"
            />
            <Button
              onClick={handleQuickAdd}
              disabled={isQuickAdding || !quickAddName.trim() || !quickAddPhone.trim()}
              className="gap-2"
            >
              {isQuickAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Thêm nhanh
                </>
              )}
            </Button>
            {(quickAddName || quickAddPhone) && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuickAddName("");
                  setQuickAddPhone("");
                }}
              >
                Làm mới
              </Button>
            )}
          </div>
          <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
            💡 Nhập tên và SĐT để lưu ngay khách hàng vào hệ thống hoặc sử dụng khi tạo đơn hàng.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} className="gap-2 shrink-0">
            <Search className="h-4 w-4" />
            Tra cứu
          </Button>
          {(searchInput || search) && (
            <Button variant="outline" onClick={handleClear} className="shrink-0">
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Data View */}
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm">Đang tải danh sách khách hàng...</p>
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive border rounded-xl bg-destructive/5 p-6">
            <p className="font-semibold">Không thể tải danh sách khách hàng</p>
            <p className="text-xs text-muted-foreground">{query.error?.message}</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground flex justify-between items-center px-1">
              <span>
                Tìm thấy:{" "}
                <strong className="text-foreground">{query.data?.data?.length || 0}</strong> khách
                hàng
              </span>
              {search && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  Đang lọc theo: &ldquo;{search}&rdquo;
                </span>
              )}
            </div>

            {!query.data?.data || query.data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border rounded-xl border-dashed p-8 text-center">
                <p className="font-medium">
                  {search
                    ? `Không tìm thấy khách hàng nào khớp với "${search}"`
                    : "Chưa có khách hàng nào trong hệ thống"}
                </p>
                <p className="text-xs mt-1">
                  {search
                    ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
                    : "Hãy dùng biểu mẫu phía trên để thêm khách hàng đầu tiên."}
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={query.data.data}
                rowKey={(row) => String(row.id)}
                loading={query.isFetching}
              />
            )}
          </div>
        )}

        {/* Dialog Thêm / Sửa khách hàng */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg space-y-4 rounded-xl bg-card border shadow-xl p-6 text-card-foreground animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editing ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editing
                      ? "Cập nhật thông tin chi tiết của khách hàng"
                      : "Điền thông tin để tạo khách hàng mới trong hệ thống"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-xs font-medium">
                    Họ và tên khách hàng <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone" className="text-xs font-medium">
                    Số điện thoại <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cust-phone"
                    placeholder="Ví dụ: 0912345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-email" className="text-xs font-medium">
                    Email <span className="text-muted-foreground text-[11px]">(tùy chọn)</span>
                  </Label>
                  <Input
                    id="cust-email"
                    type="email"
                    placeholder="Ví dụ: nguyenvana@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-address" className="text-xs font-medium">
                    Địa chỉ giao hàng{" "}
                    <span className="text-muted-foreground text-[11px]">(tùy chọn)</span>
                  </Label>
                  <Input
                    id="cust-address"
                    placeholder="Ví dụ: Số 123 đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-note" className="text-xs font-medium">
                    Ghi chú <span className="text-muted-foreground text-[11px]">(tùy chọn)</span>
                  </Label>
                  <Textarea
                    id="cust-note"
                    rows={2}
                    placeholder="Ghi chú thêm về sở thích, địa chỉ nhận hàng..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                  Hủy
                </Button>
                <Button
                  onClick={save}
                  disabled={isSaving || !form.name.trim() || !form.phone.trim()}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : editing ? (
                    "Lưu thay đổi"
                  ) : (
                    "Thêm khách hàng"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog Chi tiết khách hàng */}
        {detailOpen && viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border shadow-xl p-6 text-card-foreground space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold">{viewing.name}</h2>
                  <p className="text-sm text-muted-foreground">Chi tiết thông tin khách hàng</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Số điện thoại
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    {viewing.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {viewing.email || "-"}
                  </p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Địa chỉ</p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span>{viewing.address || "-"}</span>
                  </p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú</p>
                  <p className="text-sm">{viewing.note || "-"}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border">
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{viewing.totalOrders || 0}</p>
                  <p className="text-xs text-muted-foreground">Tổng đơn</p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                  <p className="text-sm text-muted-foreground">Đang tải lịch sử...</p>
                ) : ordersQuery.data?.data && ordersQuery.data.data.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {ordersQuery.data.data.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
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
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium">
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
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
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa thông tin
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
