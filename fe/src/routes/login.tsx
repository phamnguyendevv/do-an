import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookMarked, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { demoAccounts } from "@/services/auth-service";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — BookStock" },
      { name: "description", content: "Đăng nhập vào hệ thống quản lý kho sách BookStock (demo frontend)." },
      { property: "og:title", content: "Đăng nhập — BookStock" },
      { property: "og:description", content: "Truy cập hệ thống quản lý kho sách BookStock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, hydrated, login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("disabled") === "1") {
        setError("Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên. Bạn đã bị đăng xuất khỏi hệ thống.");
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
                <Label htmlFor="password">
                  Mật khẩu <span className="text-destructive">*</span>
                </Label>
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
    </main>
  );
}
