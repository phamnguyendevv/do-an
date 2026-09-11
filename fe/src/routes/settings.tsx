import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Key,
  Play,
  QrCode,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { sepayApi } from "@/lib/order-api";
import {
  defaultSepayConfig,
  defaultStoreBranding,
  storeSettingsService,
  VIETNAM_BANKS,
  type SepayConfig,
  type StoreBranding,
} from "@/services/store-settings";
import { formatCurrency } from "@/utils/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Cài đặt hệ thống & Thanh toán — BookStock" },
      {
        name: "description",
        content:
          "Cấu hình tài khoản ngân hàng SePay, cổng thanh toán VietQR và thông tin nhà sách.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [sepayConfig, setSepayConfig] = useState<SepayConfig>(defaultSepayConfig);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(defaultStoreBranding);
  const [previewAmount, setPreviewAmount] = useState<number>(50000);
  const [testOrderCode, setTestOrderCode] = useState<string>("ORD-2025001");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Load saved configurations on mount
  useEffect(() => {
    setSepayConfig(storeSettingsService.getSepayConfig());
    setStoreBranding(storeSettingsService.getStoreBranding());
  }, []);

  const liveQrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(
    sepayConfig.bank,
  )}&acc=${encodeURIComponent(sepayConfig.accountNumber)}&template=${encodeURIComponent(
    sepayConfig.qrTemplate || "compact",
  )}&amount=${previewAmount}&des=${encodeURIComponent(testOrderCode)}`;

  // Derive Webhook URL based on current host
  const backendBase =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : "http://localhost:3000";
  const webhookUrl = `${backendBase}/api/v1/payment/sepay/webhook`;

  const handleSaveSepay = () => {
    if (!sepayConfig.accountNumber.trim()) {
      toast.error("Vui lòng nhập số tài khoản ngân hàng!");
      return;
    }
    if (!sepayConfig.accountName.trim()) {
      toast.error("Vui lòng nhập tên chủ tài khoản!");
      return;
    }
    storeSettingsService.saveSepayConfig(sepayConfig);
    toast.success("Đã lưu cấu hình tài khoản SePay thành công!");
  };

  const handleResetSepay = () => {
    setSepayConfig(defaultSepayConfig);
    storeSettingsService.saveSepayConfig(defaultSepayConfig);
    toast.info("Đã khôi phục cấu hình SePay về mặc định.");
  };

  const handleSaveStore = () => {
    if (!storeBranding.storeName.trim()) {
      toast.error("Tên cửa hàng không được để trống!");
      return;
    }
    storeSettingsService.saveStoreBranding(storeBranding);
    toast.success("Đã lưu thông tin nhà sách thành công!");
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!testOrderCode.trim()) {
      toast.error("Vui lòng nhập mã đơn hàng để test!");
      return;
    }
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await sepayApi.simulateWebhook(testOrderCode.trim(), previewAmount);
      setSimulationResult(res);
      if (res.success) {
        toast.success(res.message || "Xác nhận thanh toán tự động thành công!");
      } else {
        toast.warning(res.message || "Webhook đã nhận nhưng không khớp đơn");
      }
    } catch (e: any) {
      toast.error(`Lỗi gửi webhook: ${e.message}`);
      setSimulationResult({ success: false, error: e.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Cài đặt hệ thống"
          description="Quản lý cấu hình thanh toán SePay VietQR, thông tin tài khoản ngân hàng và thông tin nhà sách."
        />

        <Tabs defaultValue="sepay" className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-lg">
            <TabsTrigger value="sepay" className="gap-1.5 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" /> Thanh toán SePay
            </TabsTrigger>
            <TabsTrigger value="store" className="gap-1.5 text-xs sm:text-sm">
              <Store className="h-4 w-4" /> Thông tin Cửa hàng
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-4 w-4" /> Hướng dẫn Webhook
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CẤU HÌNH SEPAY */}
          <TabsContent value="sepay" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Form cài đặt bên trái */}
              <Card className="lg:col-span-7 shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" /> Cấu hình tài khoản SePay
                        (VietQR)
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Tiền thanh toán sẽ chuyển <strong>trực tiếp 100%</strong> vào số tài khoản
                        này khi khách quét mã.
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      Tự động gạch nợ
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank-select">Ngân hàng thụ hưởng</Label>
                    <Select
                      value={sepayConfig.bank}
                      onValueChange={(v) => setSepayConfig({ ...sepayConfig, bank: v })}
                    >
                      <SelectTrigger id="bank-select">
                        <SelectValue placeholder="Chọn ngân hàng..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {VIETNAM_BANKS.map((b) => (
                          <SelectItem key={b.code} value={b.code}>
                            {b.shortName} — {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="account-num">Số tài khoản ngân hàng (STK)</Label>
                      <Input
                        id="account-num"
                        value={sepayConfig.accountNumber}
                        onChange={(e) =>
                          setSepayConfig({ ...sepayConfig, accountNumber: e.target.value.trim() })
                        }
                        placeholder="Ví dụ: 00977512982"
                        className="font-mono font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account-name">Tên chủ tài khoản</Label>
                      <Input
                        id="account-name"
                        value={sepayConfig.accountName}
                        onChange={(e) =>
                          setSepayConfig({
                            ...sepayConfig,
                            accountName: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="Ví dụ: PHAM TRUNG NGUYEN"
                        className="uppercase font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="qr-template">Mẫu giao diện VietQR</Label>
                    <Select
                      value={sepayConfig.qrTemplate || "compact"}
                      onValueChange={(v: any) => setSepayConfig({ ...sepayConfig, qrTemplate: v })}
                    >
                      <SelectTrigger id="qr-template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">
                          Gọn gàng (Compact - Khuyên dùng cho POS)
                        </SelectItem>
                        <SelectItem value="compact2">Compact 2 (Kèm Logo ngân hàng)</SelectItem>
                        <SelectItem value="qr_only">
                          Chỉ mã QR (QR Only - Thích hợp in hóa đơn K80)
                        </SelectItem>
                        <SelectItem value="default">Đầy đủ thông tin (Default)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Sau khi lưu cấu hình, tất cả mã QR tại màn hình <strong>Bán lẻ POS</strong>,{" "}
                      <strong>In hóa đơn K80</strong> và <strong>Chi tiết đơn hàng</strong> sẽ tự
                      động cập nhật ngay lập tức theo tài khoản của bạn.
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" size="sm" onClick={handleResetSepay}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Khôi phục mặc định
                  </Button>
                  <Button size="sm" onClick={handleSaveSepay}>
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Lưu cấu hình
                  </Button>
                </CardFooter>
              </Card>

              {/* Live Preview bên phải */}
              <Card className="lg:col-span-5 shadow-none bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-primary" /> Xem trước mã VietQR (Live Preview)
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {sepayConfig.bank}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quét thử bằng App Ngân hàng bất kỳ trên điện thoại để kiểm tra thông tin người
                    nhận.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-center">
                  <div className="inline-block p-2 bg-white rounded-xl shadow-sm border border-gray-200 mx-auto">
                    <img
                      src={liveQrUrl}
                      alt="VietQR Live Preview"
                      className="w-48 h-48 object-contain mx-auto rounded"
                    />
                  </div>

                  <div className="text-xs space-y-1 bg-background p-3 rounded-lg border text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <span className="font-bold text-foreground">{sepayConfig.bank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tài khoản:</span>
                      <span className="font-mono font-bold text-foreground">
                        {sepayConfig.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chủ tài khoản:</span>
                      <span className="font-bold text-primary">{sepayConfig.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nội dung mẫu:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {testOrderCode}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1 text-left">
                      <Label className="text-[11px] text-muted-foreground">
                        Số tiền thử nghiệm
                      </Label>
                      <Input
                        type="number"
                        min="10000"
                        step="10000"
                        value={previewAmount}
                        onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <Label className="text-[11px] text-muted-foreground">Mã đơn test</Label>
                      <Input
                        value={testOrderCode}
                        onChange={(e) => setTestOrderCode(e.target.value.trim().toUpperCase())}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: THÔNG TIN CỬA HÀNG & IN BILL */}
          <TabsContent value="store" className="space-y-6">
            <Card className="max-w-2xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" /> Thông tin Nhà sách & Hóa đơn in K80
                </CardTitle>
                <CardDescription className="text-xs">
                  Thông tin này sẽ được in ở phần đầu và chân trang trên hóa đơn nhiệt K80 tại quầy
                  POS.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="store-name">Tên cửa hàng / Nhà sách</Label>
                  <Input
                    id="store-name"
                    value={storeBranding.storeName}
                    onChange={(e) =>
                      setStoreBranding({ ...storeBranding, storeName: e.target.value })
                    }
                    placeholder="NHÀ SÁCH BOOKSTOCK"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="store-address">Địa chỉ hiển thị trên hóa đơn</Label>
                  <Input
                    id="store-address"
                    value={storeBranding.address}
                    onChange={(e) =>
                      setStoreBranding({ ...storeBranding, address: e.target.value })
                    }
                    placeholder="Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-hotline">Hotline</Label>
                    <Input
                      id="store-hotline"
                      value={storeBranding.hotline}
                      onChange={(e) =>
                        setStoreBranding({ ...storeBranding, hotline: e.target.value })
                      }
                      placeholder="1900 6868"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="store-website">Website</Label>
                    <Input
                      id="store-website"
                      value={storeBranding.website}
                      onChange={(e) =>
                        setStoreBranding({ ...storeBranding, website: e.target.value })
                      }
                      placeholder="bookstock.vn"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="store-footer">Lời cảm ơn dưới chân hóa đơn</Label>
                  <Input
                    id="store-footer"
                    value={storeBranding.footerNote}
                    onChange={(e) =>
                      setStoreBranding({ ...storeBranding, footerNote: e.target.value })
                    }
                    placeholder="Xin cảm ơn Quý khách & Hẹn gặp lại!"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button size="sm" onClick={handleSaveStore}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Lưu thông tin cửa hàng
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TAB 3: HƯỚNG DẪN WEBHOOK & CÔNG CỤ TEST */}
          <TabsContent value="webhook" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Hướng dẫn cấu hình SePay Webhook */}
              <Card className="lg:col-span-7 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" /> Hướng dẫn tạo Webhook trên SePay.vn
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Để khi tiền vào tài khoản ngân hàng, hệ thống tự động gạch nợ và đổi trạng thái
                    đơn sang <strong>Đã thanh toán (PAID)</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <div className="space-y-2 rounded-lg border bg-muted/40 p-3.5">
                    <Label className="text-xs font-semibold text-foreground">
                      URL Webhook nhận thông báo thanh toán của bạn:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="h-8 text-xs font-mono bg-background"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 gap-1 text-xs"
                        onClick={() => handleCopy(webhookUrl, "URL Webhook")}
                      >
                        <Copy className="h-3.5 w-3.5" /> Sao chép
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      * Lưu ý: Nếu chạy thử nghiệm trên localhost, hãy sử dụng{" "}
                      <strong>ngrok</strong> hoặc <strong>Cloudflare Tunnel</strong> để tạo URL công
                      khai (Public URL).
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      3 Bước cấu hình trên SePay Dashboard:
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-foreground">
                      <li>
                        Đăng nhập vào{" "}
                        <strong>
                          <a
                            href="https://my.sepay.vn"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline inline-flex items-center gap-0.5"
                          >
                            my.sepay.vn <ExternalLink className="h-3 w-3" />
                          </a>
                        </strong>
                        .
                      </li>
                      <li>
                        Vào mục <strong>Tích hợp Webhook (Webhooks)</strong> ➔ Bấm{" "}
                        <strong>Tạo Webhook mới</strong>.
                      </li>
                      <li>
                        Điền các thông số:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                          <li>
                            <strong>URL nhận Webhook:</strong> Dán đường link ở ô trên vào.
                          </li>
                          <li>
                            <strong>Phương thức:</strong> Chọn <code>POST</code>
                          </li>
                          <li>
                            <strong>Kiểu dữ liệu:</strong> Chọn <code>JSON</code>
                          </li>
                          <li>
                            <strong>Sự kiện:</strong> Chọn <strong>Tiền vào (in)</strong>
                          </li>
                        </ul>
                      </li>
                      <li>
                        Bấm <strong>Lưu lại (Save)</strong>. Vậy là hoàn tất!
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Công cụ Test / Giả lập Webhook trực tiếp */}
              <Card className="lg:col-span-5 shadow-none border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Play className="h-4 w-4" /> Công cụ Kiểm thử Webhook ngay lập tức
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Giả lập một bản tin Webhook gửi về backend để kiểm tra tính năng tự động gạch nợ
                    mà không cần chuyển khoản tiền thật.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="test-code" className="text-xs">
                      Mã đơn hàng cần gạch nợ (ORD-...)
                    </Label>
                    <Input
                      id="test-code"
                      value={testOrderCode}
                      onChange={(e) => setTestOrderCode(e.target.value.trim().toUpperCase())}
                      placeholder="ORD-2025001"
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="test-amt" className="text-xs">
                      Số tiền giả lập chuyển khoản (₫)
                    </Label>
                    <Input
                      id="test-amt"
                      type="number"
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <Button
                    className="w-full h-9 text-xs gap-1.5"
                    disabled={isSimulating || !testOrderCode}
                    onClick={handleSimulateWebhook}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {isSimulating ? "Đang gửi Webhook..." : "Bắn Webhook Test gạch nợ"}
                  </Button>

                  {simulationResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        simulationResult.success
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {simulationResult.success ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" /> Kết quả: Thành công!
                          </>
                        ) : (
                          <>Lỗi gạch nợ đơn hàng</>
                        )}
                      </div>
                      <p>{simulationResult.message || simulationResult.error}</p>
                      {simulationResult.orderCode && (
                        <p className="text-[11px] opacity-80">
                          Đơn <strong>{simulationResult.orderCode}</strong> đã đổi trạng thái:{" "}
                          <strong>{simulationResult.payment}</strong> /{" "}
                          <strong>{simulationResult.status}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AppShell>
  );
}
