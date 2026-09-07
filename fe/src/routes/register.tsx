import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookMarked,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Đăng ký tài khoản — BookStock" },
      {
        name: "description",
        content: "Đăng ký tài khoản mới trên hệ thống quản lý kho sách BookStock.",
      },
      { property: "og:title", content: "Đăng ký tài khoản — BookStock" },
      { property: "og:description", content: "Tạo tài khoản quản trị hoặc nhân viên BookStock." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, hydrated, register, verifyEmail, checkExist } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // OTP Step states
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (hydrated && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [hydrated, user, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleBlurUsername = async () => {
    const val = username.trim();
    if (!val) return;
    setCheckingUsername(true);
    const res = await checkExist({ username: val });
    setCheckingUsername(false);
    if (res.usernameExists) {
      setUsernameError("Họ và tên này đã tồn tại trong hệ thống.");
    } else {
      setUsernameError(null);
    }
  };

  const handleBlurEmail = async () => {
    const val = email.trim();
    if (!val || !val.includes("@")) return;
    setCheckingEmail(true);
    const res = await checkExist({ email: val });
    setCheckingEmail(false);
    if (res.emailExists) {
      setEmailError("Địa chỉ email này đã được sử dụng.");
    } else {
      setEmailError(null);
    }
  };

  const handleBlurPhone = async () => {
    const val = phone.trim();
    if (!val) {
      setPhoneError(null);
      return;
    }
    setCheckingPhone(true);
    const res = await checkExist({ phone: val });
    setCheckingPhone(false);
    if (res.phoneExists) {
      setPhoneError("Số điện thoại này đã được sử dụng.");
    } else {
      setPhoneError(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsernameError(null);
    setEmailError(null);
    setPhoneError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername) {
      setError("Vui lòng nhập họ và tên.");
      setUsernameError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email.");
      setEmailError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);

    const res = await register({
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      confirmPassword,
      phone: trimmedPhone || undefined,
    });

    setSubmitting(false);

    if (!res.ok) {
      const errMsg = res.error ?? "Đăng ký thất bại. Vui lòng thử lại!";
      if (errMsg.toLowerCase().includes("email")) {
        setEmailError(errMsg);
      } else if (
        errMsg.toLowerCase().includes("họ và tên") ||
        errMsg.toLowerCase().includes("username")
      ) {
        setUsernameError(errMsg);
      } else if (
        errMsg.toLowerCase().includes("số điện thoại") ||
        errMsg.toLowerCase().includes("phone")
      ) {
        setPhoneError(errMsg);
      }
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Đăng ký thành công và gửi OTP, mới chuyển sang bước OTP
    setStep("otp");
    setCountdown(60);
    toast.success("Mã OTP đã được gửi đến email của bạn!");
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    setError(null);
    const res = await register({
      username: username.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      phone: phone.trim() || undefined,
    });
    setSendingOtp(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể gửi lại mã OTP.");
      toast.error(res.error ?? "Không thể gửi lại mã OTP.");
      return;
    }
    setCountdown(60);
    toast.success("Mã OTP mới đã được gửi đến email của bạn!");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim() || otp.trim().length < 4) {
      setError("Vui lòng nhập mã xác thực OTP.");
      return;
    }

    setOtpLoading(true);
    const res = await verifyEmail({
      email: email.trim(),
      inputOtp: otp.trim(),
    });
    setOtpLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Mã xác thực không hợp lệ hoặc đã hết hạn.");
      return;
    }

    toast.success("Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.");
    navigate({ to: "/login", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookMarked className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold">BookStock</h1>
          <p className="text-sm text-muted-foreground">Hệ thống quản lý kho sách</p>
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-lg">
              {step === "form" ? "Tạo tài khoản mới" : "Xác thực tài khoản"}
            </CardTitle>
            <CardDescription className="text-xs">
              {step === "form"
                ? "Nhập thông tin bên dưới để đăng ký tài khoản BookStock"
                : `Mã OTP đã được gửi đến email ${email}. Vui lòng nhập mã để kích hoạt tài khoản.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "form" ? (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="username">
                      Họ và tên <span className="text-destructive">*</span>
                    </Label>
                    {checkingUsername && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      className={`pl-9 ${usernameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (usernameError) setUsernameError(null);
                        if (error) setError(null);
                      }}
                      onBlur={handleBlurUsername}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  {usernameError && (
                    <p className="text-xs text-destructive font-medium">{usernameError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    {checkingEmail && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className={`pl-9 ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                        if (error) setError(null);
                      }}
                      onBlur={handleBlurEmail}
                      placeholder="example@gmail.com"
                      required
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive font-medium">{emailError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="phone">Số điện thoại (tùy chọn)</Label>
                    {checkingPhone && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...
                      </span>
                    )}
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                      if (error) setError(null);
                    }}
                    onBlur={handleBlurPhone}
                    placeholder="0987654321"
                  />
                  {phoneError && (
                    <p className="text-xs text-destructive font-medium">{phoneError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">
                      Mật khẩu <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-9"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">
                      Xác nhận mật khẩu <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="pl-9"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
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
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang đăng ký...
                    </>
                  ) : (
                    "Đăng ký tài khoản"
                  )}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                {sendingOtp ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-center">
                    <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Đang xử lý đăng ký và gửi mã OTP kích hoạt đến email:
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{email}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Vui lòng đợi trong giây lát...
                    </p>
                  </div>
                ) : error ? (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tài khoản đăng ký:</p>
                    <p className="text-sm font-semibold text-foreground">{email}</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                      Hệ thống đã gửi mã OTP xác nhận về địa chỉ email:
                    </p>
                    <p className="text-sm font-semibold text-foreground">{email}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Vui lòng kiểm tra hộp thư đến hoặc mục thư rác (Spam).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="otp">
                    Mã xác thực OTP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    disabled={sendingOtp}
                    className="text-center font-mono text-lg tracking-widest"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="123456"
                    required
                  />
                </div>

                {error ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-0.5 leading-relaxed font-medium">{error}</div>
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={otpLoading || sendingOtp}>
                  {otpLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang kích hoạt...
                    </>
                  ) : sendingOtp ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang gửi mã OTP...
                    </>
                  ) : (
                    "Kích hoạt tài khoản"
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setError(null);
                    }}
                    className="hover:text-foreground hover:underline cursor-pointer"
                  >
                    ← Quay lại thông tin
                  </button>

                  <button
                    type="button"
                    disabled={sendingOtp || countdown > 0}
                    onClick={handleResendOtp}
                    className="hover:text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {countdown > 0 ? `Gửi lại mã (${countdown}s)` : "Gửi lại mã OTP"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 border-t pt-4 text-center text-xs">
              <span className="text-muted-foreground">Bạn đã có tài khoản? </span>
              <Link to="/login" className="font-medium text-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Đây là bản demo frontend, không dùng cho môi trường thật.
        </p>
      </div>
    </main>
  );
}
