import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { userApi } from "@/lib/user-api";
import { authStore } from "@/services/auth-service";
import { formatDate, formatDateTime } from "@/utils/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Hồ sơ cá nhân — BookStock" },
      {
        name: "description",
        content: "Quản lý thông tin cá nhân, bảo mật tài khoản và quyền hạn hệ thống.",
      },
    ],
  }),
  component: ProfilePage,
});

export const roleDescriptions: Record<"ADMIN" | "STAFF", { name: string; desc: string; permissions: string[] }> = {
  ADMIN: {
    name: "Quản trị viên (Admin)",
    desc: "Toàn quyền truy cập và điều hành toàn bộ chức năng kho sách, báo cáo tài chính và quản lý tài khoản người dùng.",
    permissions: [
      "Quản lý sách & Danh mục",
      "Bán lẻ tại quầy (POS)",
      "Quản lý tồn kho & Kiểm kê",
      "Nhập kho & Xuất kho",
      "Quản lý đơn hàng & Vận chuyển",
      "Xem báo cáo thống kê doanh thu",
      "Quản lý người dùng & Phân quyền",
      "Cấu hình thanh toán SePay & Hệ thống",
      "Sử dụng Trợ lý AI",
    ],
  },
  STAFF: {
    name: "Nhân viên kho & Bán hàng (Staff)",
    desc: "Quyền vận hành các hoạt động kho bãi hàng ngày, bán sách tại quầy và xử lý đơn vận chuyển.",
    permissions: [
      "Quản lý sách & Tra cứu danh mục",
      "Bán lẻ tại quầy (POS)",
      "Kiểm tra tồn kho",
      "Tạo phiếu nhập / xuất kho",
      "Xử lý đơn hàng & Vận chuyển",
      "Sử dụng Trợ lý AI",
    ],
  },
};

function ProfilePage() {
  const { user: currentAuthUser, logout } = useAuth();
  const queryClient = useQueryClient();

  // Fetch full profile from API
  const {
    data: profileData,
    refetch,
  } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      try {
        const res = await userApi.getProfile();
        return res;
      } catch (err: any) {
        toast.error(err.message || "Không thể tải thông tin hồ sơ");
        return null;
      }
    },
    staleTime: 30_000,
  });

  // State for Personal Info form
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressWard, setAddressWard] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  // Sync profile data to form inputs
  useEffect(() => {
    if (profileData) {
      setUsername(profileData.username || "");
      setPhone(profileData.phone || "");
      setAddressProvince(profileData.addressProvince || "");
      setAddressDistrict(profileData.addressDistrict || "");
      setAddressWard(profileData.addressWard || "");
      setAddressDetail(profileData.addressDetail || "");
    } else if (currentAuthUser) {
      setUsername(currentAuthUser.name || "");
      setPhone(currentAuthUser.phone || "");
      setAddressProvince(currentAuthUser.addressProvince || "");
      setAddressDistrict(currentAuthUser.addressDistrict || "");
      setAddressWard(currentAuthUser.addressWard || "");
      setAddressDetail(currentAuthUser.addressDetail || "");
    }
  }, [profileData, currentAuthUser]);

  // State for Change Password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, text: "Chưa nhập", color: "bg-muted" };
    let score = 0;
    if (newPassword.length >= 6) score += 25;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword) || /[0-9]/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;

    if (score <= 25) return { score, text: "Yếu", color: "bg-red-500" };
    if (score <= 50) return { score, text: "Trung bình", color: "bg-amber-500" };
    if (score <= 75) return { score, text: "Khá mạnh", color: "bg-blue-500" };
    return { score: 100, text: "Rất mạnh", color: "bg-emerald-500" };
  }, [newPassword]);

  // Mutation: Update Profile
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!username.trim()) {
        throw new Error("Họ và tên không được để trống!");
      }
      return await userApi.updateProfile({
        username: username.trim(),
        phone: phone.trim(),
        addressProvince: addressProvince.trim(),
        addressDistrict: addressDistrict.trim(),
        addressWard: addressWard.trim(),
        addressDetail: addressDetail.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Cập nhật thông tin cá nhân thành công!");
      authStore.updateCurrentUser({
        name: username.trim(),
        phone: phone.trim(),
        addressProvince: addressProvince.trim(),
        addressDistrict: addressDistrict.trim(),
        addressWard: addressWard.trim(),
        addressDetail: addressDetail.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi cập nhật hồ sơ");
    },
  });

  // Mutation: Change Password
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!oldPassword) throw new Error("Vui lòng nhập mật khẩu hiện tại!");
      if (!newPassword) throw new Error("Vui lòng nhập mật khẩu mới!");
      if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có tối thiểu 6 ký tự!");
      if (newPassword !== confirmPassword) throw new Error("Xác nhận mật khẩu mới không trùng khớp!");
      if (oldPassword === newPassword) throw new Error("Mật khẩu mới không được trùng với mật khẩu cũ!");

      return await userApi.changePassword({
        oldPassword,
        password: newPassword,
        confirmPassword,
      });
    },
    onSuccess: () => {
      toast.success("Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!");
    },
  });

  const handleResetForm = () => {
    if (profileData) {
      setUsername(profileData.username || "");
      setPhone(profileData.phone || "");
      setAddressProvince(profileData.addressProvince || "");
      setAddressDistrict(profileData.addressDistrict || "");
      setAddressWard(profileData.addressWard || "");
      setAddressDetail(profileData.addressDetail || "");
    }
    toast.info("Đã khôi phục dữ liệu ban đầu.");
  };

  const userRoleKey = (profileData?.role === 1 || currentAuthUser?.role === "ADMIN") ? "ADMIN" : "STAFF";
  const roleInfo = roleDescriptions[userRoleKey];
  const userInitial = (username || currentAuthUser?.name || "U").slice(0, 1).toUpperCase();
  const lastLoginDisplay = profileData?.lastLogin || currentAuthUser?.lastLogin;
  const createdAtDisplay = profileData?.createdAt || currentAuthUser?.createdAt;

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Hồ sơ người dùng" },
      ]}
    >
      <PageContainer>
        <PageHeader
          title="Hồ sơ người dùng"
          description="Xem và quản lý thông tin tài khoản cá nhân, lịch sử đăng nhập, bảo mật và quyền hạn hệ thống."
        />

        {/* HERO BANNER CARD */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
          {/* Subtle background decoration */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 right-32 h-48 w-48 rounded-full bg-blue-500/5 blur-2xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Avatar & Main info */}
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              {/* Stylized Initials Avatar */}
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-2xl font-bold tracking-wider text-primary-foreground shadow-md ring-4 ring-background">
                {userInitial}
                <span
                  className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background bg-emerald-500"
                  title="Đang hoạt động"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    {username || currentAuthUser?.name || "Người dùng"}
                  </h2>
                  <Badge
                    variant="outline"
                    className={
                      userRoleKey === "ADMIN"
                        ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                        : "border-muted-foreground/30 bg-muted text-muted-foreground font-semibold"
                    }
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {userRoleKey === "ADMIN" ? "Quản trị viên (ADMIN)" : "Nhân viên (STAFF)"}
                  </Badge>
                  <StatusBadge tone="positive">Đang hoạt động</StatusBadge>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
                    {profileData?.email || currentAuthUser?.email || "—"}
                  </span>
                  {phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/80" />
                      {phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Email đã xác thực
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Highlights (Đăng nhập lần gần nhất nổi bật) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Đăng nhập gần nhất</span>
                </div>
                <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                  {lastLoginDisplay ? formatDateTime(lastLoginDisplay) : "Vừa đăng nhập"}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ● Phiên hiện tại
                </span>
              </div>

              <div className="rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  <span>Ngày tham gia</span>
                </div>
                <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                  {createdAtDisplay ? formatDate(createdAtDisplay) : "—"}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  ID: #{profileData?.id || currentAuthUser?.id || "USER"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN PROFILE TABS */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm">
              <UserIcon className="h-4 w-4" /> Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
              <KeyRound className="h-4 w-4" /> Đổi mật khẩu
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4" /> Vai trò & Hoạt động
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          <TabsContent value="personal" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Form cập nhật thông tin */}
              <Card className="lg:col-span-8 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" /> Chỉnh sửa thông tin cá nhân
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cập nhật họ tên hiển thị, số điện thoại liên hệ và địa chỉ cư trú của bạn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="prof-uname">
                        Họ và tên / Tên hiển thị <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="prof-uname"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Minh"
                        className="font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-email">Email đăng nhập</Label>
                      <Input
                        id="prof-email"
                        value={profileData?.email || currentAuthUser?.email || ""}
                        readOnly
                        disabled
                        className="bg-muted/50 text-muted-foreground font-mono text-xs cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Email được gắn liền với tài khoản và không thể tự thay đổi.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="prof-phone">Số điện thoại liên lạc</Label>
                      <Input
                        id="prof-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: 0912 345 678"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-province">Tỉnh / Thành phố</Label>
                      <Input
                        id="prof-province"
                        value={addressProvince}
                        onChange={(e) => setAddressProvince(e.target.value)}
                        placeholder="Ví dụ: TP. Hồ Chí Minh"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="prof-district">Quận / Huyện</Label>
                      <Input
                        id="prof-district"
                        value={addressDistrict}
                        onChange={(e) => setAddressDistrict(e.target.value)}
                        placeholder="Ví dụ: Quận 1"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prof-ward">Phường / Xã</Label>
                      <Input
                        id="prof-ward"
                        value={addressWard}
                        onChange={(e) => setAddressWard(e.target.value)}
                        placeholder="Ví dụ: Phường Bến Nghé"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-detail">Địa chỉ chi tiết (Số nhà, Tên đường, Tòa nhà)</Label>
                    <Input
                      id="prof-detail"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="Ví dụ: Số 123 Đường Hai Bà Trưng"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetForm}
                    disabled={updateProfileMutation.isPending}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Khôi phục
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateProfileMutation.mutate()}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Tóm tắt tài khoản bên phải */}
              <div className="space-y-6 lg:col-span-4">
                <Card className="shadow-none bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Thông tin phiên làm việc
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1.5 rounded-lg border bg-background p-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Đăng nhập gần nhất:</span>
                      </div>
                      <p className="font-mono font-bold text-foreground">
                        {lastLoginDisplay ? formatDateTime(lastLoginDisplay) : "Vừa đăng nhập"}
                      </p>
                    </div>

                    <div className="space-y-1.5 rounded-lg border bg-background p-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ngày tạo tài khoản:</span>
                      </div>
                      <p className="font-mono font-bold text-foreground">
                        {createdAtDisplay ? formatDateTime(createdAtDisplay) : "—"}
                      </p>
                    </div>

                    <div className="space-y-1.5 rounded-lg border bg-background p-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Trạng thái tài khoản:</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Hoạt động bình thường
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: ĐỔI MẬT KHẨU & BẢO MẬT */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Form đổi mật khẩu */}
              <Card className="lg:col-span-7 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" /> Đổi mật khẩu tài khoản
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Nên sử dụng mật khẩu mạnh kết hợp chữ in hoa, số và ký tự đặc biệt để bảo vệ tài khoản.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mật khẩu cũ */}
                  <div className="space-y-1.5">
                    <Label htmlFor="old-pass">
                      Mật khẩu hiện tại <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="old-pass"
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu đang sử dụng"
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* Mật khẩu mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pass">
                      Mật khẩu mới <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-pass"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Thanh đo độ mạnh mật khẩu */}
                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Độ mạnh mật khẩu:</span>
                          <span className="font-semibold">{passwordStrength.text}</span>
                        </div>
                        <Progress value={passwordStrength.score} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pass">
                      Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-pass"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {confirmPassword && newPassword && (
                      <p
                        className={`text-[11px] font-medium flex items-center gap-1 ${
                          confirmPassword === newPassword ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {confirmPassword === newPassword ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mật khẩu xác nhận trùng khớp
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5" /> Mật khẩu xác nhận chưa trùng khớp
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                  <Button
                    size="sm"
                    onClick={() => changePasswordMutation.mutate()}
                    disabled={
                      changePasswordMutation.isPending ||
                      !oldPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword
                    }
                  >
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    {changePasswordMutation.isPending ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Lời khuyên bảo mật bên phải */}
              <div className="space-y-4 lg:col-span-5">
                <Card className="shadow-none bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-900 dark:text-blue-200">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Nguyên tắc bảo mật an toàn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs text-blue-950/80 dark:text-blue-200/80">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Sử dụng ít nhất 8 ký tự với chữ in hoa, chữ thường và chữ số.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Không sử dụng ngày sinh, số điện thoại hoặc mật khẩu trùng với tài khoản khác.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Đăng xuất tài khoản khi không sử dụng trên máy tính dùng chung tại quầy POS.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: VAI TRÒ & QUYỀN HẠN HỆ THỐNG */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Danh sách quyền hạn chi tiết */}
              <Card className="lg:col-span-7 shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" /> Quyền hạn của vai trò {userRoleKey}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {roleInfo.desc}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roleInfo.permissions.map((perm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-lg border bg-background p-2.5 text-xs font-medium text-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chi tiết kỹ thuật & Lịch sử phiên */}
              <div className="space-y-6 lg:col-span-5">
                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Thông tin kỹ thuật tài khoản
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Mã ID tài khoản:</span>
                      <span className="font-mono font-bold text-foreground">
                        #{profileData?.id || currentAuthUser?.id || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Đăng nhập gần nhất:</span>
                      <span className="font-mono font-semibold text-primary">
                        {lastLoginDisplay ? formatDateTime(lastLoginDisplay) : "Vừa đăng nhập"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Ngày khởi tạo:</span>
                      <span className="font-mono text-foreground">
                        {createdAtDisplay ? formatDateTime(createdAtDisplay) : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Cập nhật lần cuối:</span>
                      <span className="font-mono text-foreground">
                        {profileData?.updatedAt ? formatDateTime(profileData.updatedAt) : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Xác thực mật khẩu:</span>
                      <span className="font-semibold text-foreground">Bcrypt Encryption</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => logout()}
                    >
                      <LogOut className="mr-1.5 h-3.5 w-3.5" /> Đăng xuất khỏi hệ thống
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AppShell>
  );
}
