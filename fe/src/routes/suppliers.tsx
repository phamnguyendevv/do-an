import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Mail, MapPin, MoreHorizontal, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supplierApi, type SupplierApiItem } from "@/lib/supplier-api";
import { Can } from "@/lib/ability";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Nhà cung cấp — BookStock" },
      { name: "description", content: "Quản lý danh sách nhà cung cấp và đối tác xuất bản sách." },
      { property: "og:title", content: "Nhà cung cấp — BookStock" },
      { property: "og:description", content: "Quản lý thông tin liên hệ và đối tác nhập sách." },
    ],
  }),
  component: SuppliersPage,
});

const supplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống").max(255, "Tên quá dài"),
  contactName: z.string().max(255, "Tên liên hệ quá dài").optional(),
  phone: z.string().max(50, "Số điện thoại quá dài").optional(),
  email: z.string().email("Email không hợp lệ").or(z.literal("")).optional(),
  address: z.string().max(500, "Địa chỉ quá dài").optional(),
  note: z.string().max(2000, "Ghi chú tối đa 2000 ký tự").optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

function SupplierFormDialog({
  supplier,
  trigger,
}: {
  supplier?: SupplierApiItem;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      contactName: supplier?.contactName ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
      note: supplier?.note ?? "",
    },
  });

  const onSubmit = async (values: SupplierFormValues) => {
    setSubmitting(true);
    try {
      if (supplier) {
        await supplierApi.update(supplier.id, values);
        toast.success("Cập nhật nhà cung cấp thành công");
      } else {
        await supplierApi.create(values);
        toast.success("Thêm nhà cung cấp mới thành công");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["supplier-names"] });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi lưu nhà cung cấp");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset({
            name: supplier?.name ?? "",
            contactName: supplier?.contactName ?? "",
            phone: supplier?.phone ?? "",
            email: supplier?.email ?? "",
            address: supplier?.address ?? "",
            note: supplier?.note ?? "",
          });
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{supplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp mới"}</DialogTitle>
          <DialogDescription>
            {supplier
              ? "Cập nhật thông tin liên hệ và địa chỉ của đối tác cung cấp sách."
              : "Thêm đối tác cung cấp sách mới vào hệ thống quản lý."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên nhà cung cấp / NXB <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: NXB Trẻ, NXB Kim Đồng, Fahasa..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người liên hệ</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên người phụ trách..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="0901234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder="Số nhà, đường, quận/huyện..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú về chiết khấu, điều khoản thanh toán, hợp đồng..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu nhà cung cấp"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierRowActions({ supplier }: { supplier: SupplierApiItem }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      await supplierApi.remove(supplier.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["supplier-names"] });
      toast.success("Đã xóa nhà cung cấp");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa nhà cung cấp");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Can I="update" a="Supplier">
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
              <SupplierFormDialog
                supplier={supplier}
                trigger={
                  <button className="flex w-full items-center px-2 py-1.5 text-sm">
                    <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                  </button>
                }
              />
            </DropdownMenuItem>
          </Can>
          <Can I="delete" a="Supplier">
            <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </DropdownMenuItem>
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>

      <Can I="delete" a="Supplier">
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Xác nhận xóa nhà cung cấp?"
          description={`Nhà cung cấp "${supplier.name}" sẽ bị xóa khỏi hệ thống.`}
          confirmLabel="Xóa"
          destructive
          onConfirm={handleDelete}
        />
      </Can>
    </>
  );
}

function SuppliersPage() {
  const [search, setSearch] = useState("");

  const { data: rawSuppliers = [], isLoading } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      try {
        const res = await supplierApi.list({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items;
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const suppliers: SupplierApiItem[] = useMemo(() => {
    if (!Array.isArray(rawSuppliers)) return [];
    return rawSuppliers
      .map((item: any) => {
        if (typeof item === "string") return { id: 0, name: item };
        return item;
      })
      .filter((item): item is SupplierApiItem => Boolean(item && typeof item.name === "string"));
  }, [rawSuppliers]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)),
    );
  }, [suppliers, search]);

  const columns: DataTableColumn<SupplierApiItem>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      value: (s) => s.id,
      cell: (s) => <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>,
    },
    {
      key: "name",
      header: "Tên nhà cung cấp",
      sortable: true,
      value: (s) => s.name,
      cell: (s) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary/70 shrink-0" />
          <span className="font-medium">{s.name}</span>
        </div>
      ),
    },
    {
      key: "contactName",
      header: "Người liên hệ",
      value: (s) => s.contactName ?? "",
      cell: (s) =>
        s.contactName ? (
          <div className="flex items-center gap-1.5 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{s.contactName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      value: (s) => s.phone ?? "",
      cell: (s) =>
        s.phone ? (
          <div className="flex items-center gap-1.5 text-sm font-mono text-xs">
            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{s.phone}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "email",
      header: "Email",
      value: (s) => s.email ?? "",
      cell: (s) =>
        s.email ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{s.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "address",
      header: "Địa chỉ",
      value: (s) => s.address ?? "",
      cell: (s) =>
        s.address ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.address}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Nhà cung cấp" }]}>
      <PageContainer>
        <PageHeader
          title="Quản lý nhà cung cấp"
          description="Danh sách đối tác xuất bản và phân phối sách cho kho hàng."
          actions={
            <Can I="create" a="Supplier">
              <SupplierFormDialog
                trigger={
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm nhà cung cấp
                  </Button>
                }
              />
            </Can>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Tổng số nhà cung cấp"
            value={suppliers.length}
            hint="Đối tác đang hoạt động"
          />
          <StatCard
            label="Có thông tin liên hệ"
            value={suppliers.filter((s) => Boolean(s.phone || s.email)).length}
            hint="Số điện thoại hoặc email"
          />
          <StatCard
            label="Đang xem"
            value={filteredData.length}
            hint={search ? `Khớp với "${search}"` : "Tất cả nhà cung cấp"}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          rowKey={(s) => s.id}
          pageSize={10}
          emptyTitle="Không tìm thấy nhà cung cấp"
          emptyDescription="Thử nhập từ khóa tìm kiếm khác hoặc thêm nhà cung cấp mới."
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-72"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm theo tên, người liên hệ, SĐT, email..."
              />
            </FilterBar>
          }
          rowActions={(s) => <SupplierRowActions supplier={s} />}
        />
        {isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu nhà cung cấp...</p>
        )}
      </PageContainer>
    </AppShell>
  );
}
