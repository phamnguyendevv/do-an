import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Plus, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockUsers, rolePermissions } from "@/mock/users";
import { formatDateTime } from "@/utils/format";
import type { User } from "@/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Người dùng — BookStock" },
      { name: "description", content: "Quản lý tài khoản nhân viên, phân quyền ADMIN / STAFF và trạng thái hoạt động." },
      { property: "og:title", content: "Người dùng — BookStock" },
      { property: "og:description", content: "Quản lý người dùng và phân quyền trong hệ thống kho sách." },
    ],
  }),
  component: UsersPage,
});

function UserFormDialog({ user, trigger }: { user?: User; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setOpen(false);
    toast.success(user ? "Cập nhật người dùng thành công" : "Thêm người dùng thành công");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</DialogTitle>
          <DialogDescription>Thông tin tài khoản và vai trò trong hệ thống.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="uname">
              Họ tên <span className="text-destructive">*</span>
            </Label>
            <Input id="uname" defaultValue={user?.name ?? ""} placeholder="Nguyễn Văn A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uemail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input id="uemail" type="email" defaultValue={user?.email ?? ""} placeholder="user@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Vai trò</Label>
            <Select defaultValue={user?.role ?? "STAFF"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="STAFF">STAFF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({ user }: { user: User }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
            <UserFormDialog
              user={user}
              trigger={<button className="flex w-full items-center px-2 py-1.5 text-sm">Chỉnh sửa</button>}
            />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast.success("Đã đổi vai trò")}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Đổi vai trò
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}>
            <UserX className="mr-2 h-4 w-4" /> {user.active ? "Vô hiệu hóa" : "Kích hoạt"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={user.active ? "Vô hiệu hóa tài khoản?" : "Kích hoạt tài khoản?"}
        description={`Tài khoản ${user.email} sẽ ${user.active ? "không thể đăng nhập" : "được phép đăng nhập"}.`}
        confirmLabel="Xác nhận"
        destructive={user.active}
        onConfirm={() => toast.success("Đã cập nhật trạng thái tài khoản")}
      />
    </>
  );
}

function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const data = useMemo(
    () =>
      mockUsers.filter((u) => {
        const q = search.trim().toLowerCase();
        const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        return matchQ && (role === "all" || u.role === role);
      }),
    [search, role],
  );

  const columns: DataTableColumn<User>[] = [
    { key: "name", header: "Họ tên", sortable: true, value: (u) => u.name, cell: (u) => <span className="font-medium">{u.name}</span> },
    { key: "email", header: "Email", sortable: true, value: (u) => u.email, cell: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { key: "role", header: "Vai trò", cell: (u) => <StatusBadge tone={u.role === "ADMIN" ? "info" : "neutral"}>{u.role}</StatusBadge> },
    { key: "status", header: "Trạng thái", cell: (u) => <StatusBadge tone={u.active ? "success" : "error"}>{u.active ? "Đang hoạt động" : "Đã vô hiệu"}</StatusBadge> },
    { key: "lastLogin", header: "Đăng nhập cuối", align: "right", sortable: true, value: (u) => u.lastLogin, cell: (u) => <span className="text-muted-foreground">{formatDateTime(u.lastLogin)}</span> },
  ];

  return (
    <AppShell requiredRole="ADMIN" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Người dùng" }]}>
      <PageContainer>
        <PageHeader
          title="Người dùng & phân quyền"
          description={`${mockUsers.length} tài khoản trong hệ thống.`}
          actions={
            <UserFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm người dùng
                </Button>
              }
            />
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {(["ADMIN", "STAFF"] as const).map((r) => (
            <Card key={r} className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quyền của {r}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {rolePermissions[r].map((p) => (
                  <StatusBadge key={p} tone={r === "ADMIN" ? "info" : "neutral"}>
                    {p}
                  </StatusBadge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={data}
          rowKey={(u) => u.id}
          emptyTitle="No users found"
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-72"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm tên hoặc email..."
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
          }
          rowActions={(u) => <UserRowActions user={u} />}
        />
      </PageContainer>
    </AppShell>
  );
}
