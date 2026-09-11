import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";
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
import { userApi, type UserApiItem } from "@/lib/user-api";
import { rolePermissions } from "@/mock/users";
import { formatDateTime } from "@/utils/format";
import type { User, UserRole } from "@/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Người dùng — BookStock" },
      {
        name: "description",
        content: "Quản lý tài khoản nhân viên, phân quyền ADMIN / STAFF và trạng thái hoạt động.",
      },
      { property: "og:title", content: "Người dùng — BookStock" },
      {
        property: "og:description",
        content: "Quản lý người dùng và phân quyền trong hệ thống kho sách.",
      },
    ],
  }),
  component: UsersPage,
});

function UserFormDialog({
  user,
  trigger,
  onSuccess,
}: {
  user?: User;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "STAFF");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!email || !username) {
        throw new Error("Vui lòng điền đủ họ tên và email");
      }
      return await userApi.create({
        username,
        email,
        password: password || "password123",
        role: role === "ADMIN" ? 1 : 2,
        status: 1,
      });
    },
    onSuccess: () => {
      toast.success("Thêm người dùng thành công");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.message || "Lỗi tạo tài khoản");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      return await userApi.update(user.id, {
        role: role === "ADMIN" ? 1 : 2,
      });
    },
    onSuccess: () => {
      toast.success("Cập nhật vai trò người dùng thành công");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.message || "Lỗi cập nhật người dùng");
    },
  });

  const save = () => {
    setError(null);
    if (user) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
          <DialogDescription>
            Thông tin tài khoản và vai trò trong hệ thống BookStock.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="uname">
              Họ tên / Tên tài khoản <span className="text-destructive">*</span>
            </Label>
            <Input
              id="uname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={!!user}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uemail">
              Email đăng nhập <span className="text-destructive">*</span>
            </Label>
            <Input
              id="uemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={!!user}
            />
          </div>
          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="upassword">Mật khẩu khởi tạo</Label>
              <Input
                id="upassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mặc định: password123"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Vai trò</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN (Quản trị viên)</SelectItem>
                <SelectItem value="STAFF">STAFF (Nhân viên)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={save} disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminResetPasswordDialog({ user, trigger }: { user: User; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword.trim()) {
        throw new Error("Vui lòng nhập mật khẩu mới");
      }
      if (newPassword.trim().length < 6) {
        throw new Error("Mật khẩu mới phải có tối thiểu 6 ký tự");
      }
      return await userApi.adminResetPassword(user.id, newPassword.trim());
    },
    onSuccess: () => {
      toast.success(`Đã cấp lại mật khẩu cho tài khoản ${user.email} thành công!`);
      setOpen(false);
    },
    onError: (err: any) => {
      setError(err.message || "Lỗi cấp lại mật khẩu");
    },
  });

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success("Đã sao chép mật khẩu mới vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-amber-500" /> Cấp lại mật khẩu cho nhân viên
          </DialogTitle>
          <DialogDescription className="text-xs">
            Admin thiết lập mật khẩu mới trực tiếp cho tài khoản{" "}
            <strong className="text-foreground">{user.name}</strong> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1 text-xs">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tài khoản:</span>
              <span className="font-semibold text-foreground">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email đăng nhập:</span>
              <span className="font-mono text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vai trò:</span>
              <span className="font-semibold text-primary">{user.role}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-new-pass" className="text-xs">
              Mật khẩu mới khởi tạo <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="admin-new-pass"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="pr-20 font-mono text-xs font-semibold"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Sao chép mật khẩu"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={generateRandomPassword}
              >
                <Sparkles className="h-3 w-3 text-amber-500" /> Tạo mật khẩu ngẫu nhiên
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setNewPassword("password123")}
              >
                Đặt về "password123"
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <p className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-md border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
            * Sau khi cấp lại, hãy sao chép mật khẩu này và gửi riêng cho nhân viên để họ đăng nhập
            và đổi lại mật khẩu cá nhân.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || !newPassword.trim()}
          >
            {resetMutation.isPending ? "Đang xử lý..." : "Xác nhận cấp lại mật khẩu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({ user }: { user: User }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const nextStatus = user.active ? 2 : 1; // 1: Active, 2: Inactive
      return await userApi.update(user.id, { status: nextStatus });
    },
    onSuccess: () => {
      toast.success(user.active ? "Đã vô hiệu hóa tài khoản" : "Đã kích hoạt tài khoản thành công");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi cập nhật trạng thái tài khoản");
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async () => {
      const nextRole = user.role === "ADMIN" ? 2 : 1;
      return await userApi.update(user.id, { role: nextRole });
    },
    onSuccess: () => {
      toast.success("Đã thay đổi vai trò tài khoản thành công");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi thay đổi vai trò");
    },
  });

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
              trigger={
                <button className="flex w-full items-center px-2 py-1.5 text-sm">
                  Chỉnh sửa vai trò
                </button>
              }
            />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
            <AdminResetPasswordDialog
              user={user}
              trigger={
                <button className="flex w-full items-center px-2 py-1.5 text-sm text-amber-600 dark:text-amber-400">
                  <KeyRound className="mr-2 h-4 w-4" /> Cấp lại mật khẩu
                </button>
              }
            />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toggleRoleMutation.mutate()}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Đổi sang{" "}
            {user.role === "ADMIN" ? "STAFF" : "ADMIN"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={user.active ? "text-destructive" : "text-emerald-600"}
            onSelect={() => setConfirmOpen(true)}
          >
            {user.active ? (
              <>
                <UserX className="mr-2 h-4 w-4" /> Vô hiệu hóa
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" /> Kích hoạt lại
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={user.active ? "Vô hiệu hóa tài khoản?" : "Kích hoạt tài khoản?"}
        description={`Tài khoản ${user.email} sẽ ${user.active ? "không thể đăng nhập hệ thống" : "được phép đăng nhập lại"}.`}
        confirmLabel="Xác nhận"
        destructive={user.active}
        onConfirm={() => toggleStatusMutation.mutate()}
      />
    </>
  );
}

const mapApiUser = (u: UserApiItem): User => ({
  id: String(u.id),
  name: u.username || (u.email ? u.email.split("@")[0] : "") || "User",
  email: u.email,
  role: u.role === 1 ? "ADMIN" : "STAFF",
  active: u.status === 1,
  lastLogin: u.lastLogin || u.createdAt || new Date().toISOString(),
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const {
    data: usersData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res: any = await userApi.list({ size: 200 });
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return items.map(mapApiUser);
    },
    staleTime: 10_000,
  });

  const data = useMemo(
    () =>
      usersData.filter((u) => {
        const q = search.trim().toLowerCase();
        const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        return matchQ && (role === "all" || u.role === role);
      }),
    [usersData, search, role],
  );

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: "Họ tên / Tên tài khoản",
      sortable: true,
      value: (u) => u.name,
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      value: (u) => u.email,
      cell: (u) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: "role",
      header: "Vai trò",
      cell: (u) => (
        <StatusBadge tone={u.role === "ADMIN" ? "info" : "neutral"}>{u.role}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (u) => (
        <StatusBadge tone={u.active ? "positive" : "negative"}>
          {u.active ? "Đang hoạt động" : "Đã vô hiệu"}
        </StatusBadge>
      ),
    },
    {
      key: "lastLogin",
      header: "Đăng nhập gần nhất",
      align: "right",
      sortable: true,
      value: (u) => u.lastLogin || "",
      cell: (u) => (
        <span className="text-muted-foreground text-xs">{formatDateTime(u.lastLogin)}</span>
      ),
    },
  ];

  return (
    <AppShell
      requiredAbility={{ action: "search", subject: "User" }}
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Người dùng" }]}
    >
      <PageContainer>
        <PageHeader
          title="Người dùng & phân quyền"
          description={`${usersData.length} tài khoản trong hệ thống BookStock.`}
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
                <CardTitle className="text-base">Quyền hạn của {r}</CardTitle>
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
          loading={isLoading}
          error={
            isError
              ? error instanceof Error
                ? error.message
                : "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và thử lại!"
              : null
          }
          emptyTitle="Không tìm thấy người dùng nào"
          emptyDescription="Chưa có dữ liệu người dùng hoặc danh sách đang trống."
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
