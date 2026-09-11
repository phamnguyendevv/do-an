import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { demoAccounts } from "@/services/auth-service";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — BookStock" },
      {
        name: "description",
        content: "Đăng nhập vào hệ thống quản lý kho sách BookStock (demo frontend).",
      },
      { property: "og:title", content: "Đăng nhập — BookStock" },
      {
        property: "og:description",
        content: "Hệ thống quản lý kho và bán lẻ sách BookStock.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, hydrated, login, forgotPassword, verifyResetOtp, resetPassword } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot password 3-step state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "password">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("disabled") === "1") {
        setError(
          "Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên. Bạn đã bị đăng xuất khỏi hệ thống.",
        );
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (hydrated && user) navigate({ to: "/dashboard", replace: true });
  }, [hydrated, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login({ email, password });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Đăng nhập thất bại.");
      return;
    }
    toast.success("Đăng nhập thành công");
    navigate({ to: "/dashboard", replace: true });
  };

  // Bước 1: Kiểm tra email và gửi OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotError("Vui lòng nhập địa chỉ email.");
      return;
    }
    setForgotLoading(true);
    const res = await forgotPassword(trimmedEmail);
    setForgotLoading(false);
    if (!res.ok) {
      setForgotError(res.error ?? "Email này không tồn tại trong hệ thống. Vui lòng kiểm tra lại!");
      return;
    }
    toast.success("Mã xác thực OTP đã được gửi đến email của bạn.");
    setForgotStep("otp");
    setForgotOtp("");
    setResendCountdown(60);
  };

  // Gửi lại mã OTP
  const handleResendForgotOtp = async () => {
    if (resendCountdown > 0 || forgotLoading) return;
    setForgotError(null);
    setForgotLoading(true);
    const res = await forgotPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (!res.ok) {
      setForgotError(res.error ?? "Không thể gửi lại mã OTP. Vui lòng thử lại!");
      return;
    }
    toast.success("Đã gửi lại mã OTP đến email của bạn.");
    setResendCountdown(60);
  };

  // Bước 2: Xác thực mã OTP
  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    const trimmedOtp = forgotOtp.trim();
    if (!trimmedOtp) {
      setForgotError("Vui lòng nhập mã OTP đã nhận.");
      return;
    }
    if (trimmedOtp.length !== 6) {
      setForgotError("Mã OTP phải có đúng 6 chữ số.");
      return;
    }

    setForgotLoading(true);
    const res = await verifyResetOtp(forgotEmail.trim(), trimmedOtp);
    setForgotLoading(false);
    if (!res.ok) {
      setForgotError(res.error ?? "Mã OTP không chính xác hoặc đã hết hạn!");
      return;
    }

    toast.success("Xác thực mã OTP thành công! Vui lòng nhập mật khẩu mới.");
    setForgotStep("password");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (newPassword.length < 6) {
      setForgotError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setForgotLoading(true);
    const res = await resetPassword({
      email: forgotEmail.trim(),
      inputOtp: forgotOtp.trim(),
      newPassword,
    });
    setForgotLoading(false);
    if (!res.ok) {
      setForgotError(res.error ?? "Đặt lại mật khẩu thất bại. Vui lòng thử lại!");
      return;
    }

    toast.success("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.");
    setEmail(forgotEmail.trim());
    setPassword("");
    setForgotOpen(false);
    setForgotStep("email");
    setForgotOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookMarked className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold">BookStock</h1>
          <p className="text-sm text-muted-foreground">Hệ thống quản lý kho sách</p>
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    Mật khẩu <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(true);
                      setForgotError(null);
                      setForgotStep("email");
                      setForgotEmail(email || "");
                    }}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                />
              </div>
              {error ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-0.5 leading-relaxed font-medium">{error}</div>
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs">
              <span className="text-muted-foreground">Chưa có tài khoản? </span>
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Đăng ký ngay
              </Link>
            </div>

            <div className="mt-5 space-y-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Tài khoản demo</p>
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    if (error) setError(null);
                  }}
                >
                  <span className="font-mono">{a.email}</span>
                  <span className="text-muted-foreground">
                    {a.password} · {a.role}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Đây là bản demo frontend, không dùng cho môi trường thật.
        </p>
      </div>

      {/* Dialog Quên Mật Khẩu 3 Bước */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {forgotStep === "email" && "Quên mật khẩu"}
              {forgotStep === "otp" && "Xác thực mã OTP"}
              {forgotStep === "password" && "Đặt lại mật khẩu mới"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {forgotStep === "email" &&
                "Nhập email tài khoản. Hệ thống sẽ kiểm tra tài khoản và gửi mã OTP xác thực."}
              {forgotStep === "otp" && `Mã xác thực 6 chữ số đã được gửi đến email ${forgotEmail}.`}
              {forgotStep === "password" && `Nhập mật khẩu mới cho tài khoản ${forgotEmail}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper chỉ báo các bước */}
          <div className="flex items-center justify-between px-1 py-2 border-b text-xs">
            <div
              className={`flex items-center gap-1.5 ${
                forgotStep === "email" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  forgotStep === "email"
                    ? "bg-primary text-primary-foreground font-bold"
                    : forgotStep === "otp" || forgotStep === "password"
                      ? "bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {forgotStep === "otp" || forgotStep === "password" ? "✓" : "1"}
              </span>
              <span>Nhập email</span>
            </div>
            <div className="h-[1px] w-6 bg-border" />
            <div
              className={`flex items-center gap-1.5 ${
                forgotStep === "otp" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  forgotStep === "otp"
                    ? "bg-primary text-primary-foreground font-bold"
                    : forgotStep === "password"
                      ? "bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {forgotStep === "password" ? "✓" : "2"}
              </span>
              <span>Nhập OTP</span>
            </div>
            <div className="h-[1px] w-6 bg-border" />
            <div
              className={`flex items-center gap-1.5 ${
                forgotStep === "password" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  forgotStep === "password"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
              <span>Mật khẩu mới</span>
            </div>
          </div>

          {/* BƯỚC 1: NHẬP EMAIL & KIỂM TRA TÀI KHOẢN */}
          {forgotStep === "email" && (
            <form onSubmit={handleSendForgotOtp} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">
                  Email tài khoản <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    className="pl-9"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    placeholder="email@example.com"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ kiểm tra xem Gmail/Email có tồn tại không trước khi gửi mã OTP.
                </p>
              </div>

              {forgotError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="font-medium">{forgotError}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang kiểm tra...
                    </>
                  ) : (
                    "Tiếp tục gửi OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* BƯỚC 2: NHẬP VÀ XÁC THỰC MÃ OTP */}
          {forgotStep === "otp" && (
            <form onSubmit={handleVerifyForgotOtp} className="space-y-4 pt-1">
              <div className="rounded-md bg-muted/60 p-3 text-xs space-y-1">
                <p className="text-muted-foreground">Mã OTP đã được gửi thành công đến:</p>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {forgotEmail}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="forgot-otp">
                  Mã OTP (6 chữ số) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="font-mono text-center text-xl font-bold tracking-[0.4em]"
                  value={forgotOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForgotOtp(val);
                    if (forgotError) setForgotError(null);
                  }}
                  placeholder="123456"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Chưa nhận được mã?</span>
                <button
                  type="button"
                  disabled={resendCountdown > 0 || forgotLoading}
                  onClick={handleResendForgotOtp}
                  className="font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resendCountdown > 0 ? `Gửi lại sau (${resendCountdown}s)` : "Gửi lại mã OTP"}
                </button>
              </div>

              {forgotError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="font-medium">{forgotError}</div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep("email");
                    setForgotError(null);
                  }}
                  className="text-xs text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Đổi email
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={forgotLoading || forgotOtp.trim().length !== 6}>
                    {forgotLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang kiểm tra...
                      </>
                    ) : (
                      "Xác nhận OTP"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* BƯỚC 3: CẬP NHẬT LẠI MẬT KHẨU MỚI (CHỈ HIỂN THỊ KHI ĐÃ NHẬP ĐÚNG OTP) */}
          {forgotStep === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">
                  Mật khẩu mới <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    className="pl-9 pr-9"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    placeholder="Tối thiểu 6 ký tự"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">
                  Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-9 pr-9"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {forgotError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="font-medium">{forgotError}</div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep("otp");
                    setForgotError(null);
                  }}
                  className="text-xs text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Quay lại OTP
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={forgotLoading}>
                    {forgotLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang cập nhật...
                      </>
                    ) : (
                      "Cập nhật mật khẩu"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
