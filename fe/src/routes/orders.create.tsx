import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ProductLines, type ProductLine } from "@/components/inventory/product-lines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/utils/format";
import { orderService } from "@/services/order-service";
import { useBooks } from "@/hooks/use-store";
import { ghnApi, type GhnDistrict, type GhnProvince, type GhnWard } from "@/lib/ghn-api";

export const Route = createFileRoute("/orders/create")({
  head: () => ({
    meta: [
      { title: "Tạo đơn hàng — BookStock" },
      { name: "description", content: "Tạo đơn hàng mới tích hợp vận chuyển Giao Hàng Nhanh (GHN)." },
      { property: "og:title", content: "Tạo đơn hàng — BookStock" },
      { property: "og:description", content: "Form tạo đơn hàng và đẩy vận đơn GHN tự động." },
    ],
  }),
  component: CreateOrderPage,
});

function CreateOrderPage() {
  const navigate = useNavigate();
  const books = useBooks();

  // Khách hàng & Địa chỉ 3 cấp GHN
  const [customer, setCustomer] = useState({ name: "", phone: "", detailAddress: "", note: "" });
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [wardCode, setWardCode] = useState<string>("");

  // Vận chuyển GHN
  const [carrierType, setCarrierType] = useState<"GHN" | "STORE" | "OTHER">("GHN");
  const [requiredNote, setRequiredNote] = useState<"CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG" | "CHOTHUHANG">("CHOXEMHANGKHONGTHU");
  const [paymentTypeId, setPaymentTypeId] = useState<number>(2); // 1: Shop trả, 2: Khách trả
  const [autoCreateGhnOrder, setAutoCreateGhnOrder] = useState(true);

  // Phí ship & Chiết khấu
  const [manualShippingFee, setManualShippingFee] = useState(30000);
  const [ghnShippingFee, setGhnShippingFee] = useState<number | null>(null);
  const [ghnLeadTime, setGhnLeadTime] = useState<string | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Sản phẩm
  const [lines, setLines] = useState<ProductLine[]>([{ bookId: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Tải danh sách 63 Tỉnh/Thành từ GHN
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ["ghn-provinces"],
    queryFn: async () => {
      try {
        const res = await ghnApi.getProvinces();
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải tỉnh thành GHN:", e);
        return [];
      }
    },
    staleTime: 300_000,
  });

  // 2. Tải danh sách Quận/Huyện theo Tỉnh
  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["ghn-districts", provinceId],
    queryFn: async () => {
      if (!provinceId) return [];
      try {
        const res = await ghnApi.getDistricts(provinceId);
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải quận huyện GHN:", e);
        return [];
      }
    },
    enabled: Boolean(provinceId),
    staleTime: 300_000,
  });

  // 3. Tải danh sách Phường/Xã theo Quận
  const { data: wards = [], isLoading: loadingWards } = useQuery({
    queryKey: ["ghn-wards", districtId],
    queryFn: async () => {
      if (!districtId) return [];
      try {
        const res = await ghnApi.getWards(districtId);
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải phường xã GHN:", e);
        return [];
      }
    },
    enabled: Boolean(districtId),
    staleTime: 300_000,
  });

  // Tính tổng số lượng & trọng lượng ước tính (300g/cuốn)
  const totalItems = useMemo(() => lines.reduce((s, l) => s + (l.quantity || 0), 0), [lines]);
  const estimatedWeight = Math.max(300, totalItems * 300);
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.quantity || 0) * (l.price || 0), 0),
    [lines],
  );

  // 4. Tự động tính cước GHN khi đã chọn District + Ward + Sách
  useEffect(() => {
    if (carrierType !== "GHN" || !districtId || !wardCode || totalItems === 0) {
      if (carrierType !== "GHN") setGhnShippingFee(null);
      return;
    }

    let isMounted = true;
    const calculate = async () => {
      setIsCalculatingFee(true);
      try {
        const [feeRes, leadTimeRes] = await Promise.allSettled([
          ghnApi.calculateFee({
            toDistrictId: districtId,
            toWardCode: wardCode,
            weight: estimatedWeight,
            insuranceValue: subtotal,
          }),
          ghnApi.calculateLeadTime({
            toDistrictId: districtId,
            toWardCode: wardCode,
          }),
        ]);

        if (isMounted) {
          if (feeRes.status === "fulfilled" && feeRes.value?.total) {
            setGhnShippingFee(feeRes.value.total);
          } else {
            setGhnShippingFee(32000); // fallback hợp lý
          }

          if (leadTimeRes.status === "fulfilled" && leadTimeRes.value?.leadtime) {
            const date = new Date(leadTimeRes.value.leadtime * 1000);
            setGhnLeadTime(date.toLocaleDateString("vi-VN"));
          }
        }
      } catch (e) {
        console.error("Lỗi tính phí ship GHN:", e);
        if (isMounted) setGhnShippingFee(32000);
      } finally {
        if (isMounted) setIsCalculatingFee(false);
      }
    };

    const timer = setTimeout(calculate, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [carrierType, districtId, wardCode, estimatedWeight, subtotal, totalItems]);

  const shippingFee = useMemo(() => {
    if (carrierType === "STORE") return 0;
    if (carrierType === "GHN") return ghnShippingFee ?? 32000;
    return manualShippingFee;
  }, [carrierType, ghnShippingFee, manualShippingFee]);

  const total = Math.max(0, subtotal - discount + shippingFee);

  // Ghép chuỗi địa chỉ đầy đủ
  const fullAddress = useMemo(() => {
    const pName = provinces.find((p) => p.ProvinceID === provinceId)?.ProvinceName;
    const dName = districts.find((d) => d.DistrictID === districtId)?.DistrictName;
    const wName = wards.find((w) => w.WardCode === wardCode)?.WardName;
    const parts = [customer.detailAddress, wName, dName, pName].filter(Boolean);
    return parts.join(", ");
  }, [customer.detailAddress, provinces, provinceId, districts, districtId, wards, wardCode]);

  const submit = async () => {
    setError(null);
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại khách hàng.");
      return;
    }

    if (carrierType === "GHN" && (!districtId || !wardCode)) {
      setError("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã để giao hàng GHN.");
      return;
    }

    setSubmitting(true);
    let ghnTrackingCode: string | undefined = undefined;

    // Đẩy đơn sang GHN Sandbox nếu chọn GHN
    if (carrierType === "GHN" && autoCreateGhnOrder && districtId && wardCode) {
      try {
        const orderItems = lines
          .filter((l) => l.bookId && l.quantity > 0)
          .map((l) => {
            const b = books.find((x) => String(x.id) === String(l.bookId));
            return {
              name: b?.title || "Sách",
              code: String(l.bookId),
              quantity: l.quantity,
              price: l.price,
              weight: 300,
            };
          });

        const tempClientCode = `ORD-${Date.now().toString().slice(-6)}`;
        const ghnRes = await ghnApi.createOrder({
          clientOrderCode: tempClientCode,
          toName: customer.name,
          toPhone: customer.phone,
          toAddress: customer.detailAddress || fullAddress,
          toDistrictId: districtId,
          toWardCode: wardCode,
          codAmount: paymentTypeId === 2 ? total : 0, // Thu hộ COD nếu khách trả
          note: customer.note,
          requiredNote,
          paymentTypeId,
          weight: estimatedWeight,
          items: orderItems,
        });

        if (ghnRes?.order_code) {
          ghnTrackingCode = ghnRes.order_code;
          toast.success(`Đã tạo vận đơn GHN: ${ghnRes.order_code}`, {
            description: `Cước GHN: ${formatCurrency(ghnRes.total_fee || shippingFee)}`,
          });
        }
      } catch (ghnErr: any) {
        console.error("Lỗi đẩy đơn GHN:", ghnErr);
        toast.warning("Không thể kết nối GHN Sandbox, đơn hàng vẫn được lưu vào hệ thống nội bộ.", {
          description: ghnErr.message,
        });
      }
    }

    const res = await orderService.createOrder({
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: fullAddress || customer.detailAddress,
      shippingMethod: carrierType === "GHN" ? "Giao Hàng Nhanh (GHN)" : carrierType === "STORE" ? "Tại cửa hàng" : "Vận chuyển khác",
      shippingFee,
      discount,
      trackingCode: ghnTrackingCode,
      note: customer.note,
      expectedDelivery: ghnLeadTime || undefined,
      lines,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể tạo đơn hàng.");
      return;
    }

    toast.success(`Tạo đơn hàng ${res.data?.id} thành công — tồn kho đã được trừ`);
    navigate({ to: "/orders" });
  };

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đơn hàng", href: "/orders" },
        { label: "Tạo đơn hàng" },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại đơn hàng
          </Link>
        </Button>

        <PageHeader
          title="Tạo đơn hàng mới"
          description="Tạo đơn bán sách và kết nối tự động với vận chuyển Giao Hàng Nhanh (GHN)."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* 1. Thông tin khách hàng & Địa chỉ GHN */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Thông tin khách hàng & Địa chỉ nhận</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cname">
                      Họ và tên khách hàng <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cname"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cphone">
                      Số điện thoại nhận hàng <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cphone"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <Label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Địa chỉ giao hàng (Chuẩn GHN 3 Cấp)
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Tỉnh / Thành phố */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tỉnh / Thành phố <span className="text-destructive">*</span></Label>
                      <Select
                        value={provinceId ? String(provinceId) : ""}
                        onValueChange={(v) => {
                          const id = Number(v);
                          setProvinceId(id);
                          setDistrictId(undefined);
                          setWardCode("");
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={loadingProvinces ? "Đang tải tỉnh/thành..." : "Chọn Tỉnh / TP"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {provinces.map((p) => (
                            <SelectItem key={p.ProvinceID} value={String(p.ProvinceID)}>
                              {p.ProvinceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quận / Huyện */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quận / Huyện <span className="text-destructive">*</span></Label>
                      <Select
                        value={districtId ? String(districtId) : ""}
                        disabled={!provinceId || loadingDistricts}
                        onValueChange={(v) => {
                          const id = Number(v);
                          setDistrictId(id);
                          setWardCode("");
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={loadingDistricts ? "Đang tải quận/huyện..." : "Chọn Quận / Huyện"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {districts.map((d) => (
                            <SelectItem key={d.DistrictID} value={String(d.DistrictID)}>
                              {d.DistrictName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phường / Xã */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phường / Xã <span className="text-destructive">*</span></Label>
                      <Select
                        value={wardCode}
                        disabled={!districtId || loadingWards}
                        onValueChange={setWardCode}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={loadingWards ? "Đang tải phường/xã..." : "Chọn Phường / Xã"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {wards.map((w) => (
                            <SelectItem key={w.WardCode} value={w.WardCode}>
                              {w.WardName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="caddr" className="text-xs">Số nhà, tên tòa nhà, tên đường</Label>
                    <Input
                      id="caddr"
                      value={customer.detailAddress}
                      onChange={(e) => setCustomer({ ...customer, detailAddress: e.target.value })}
                      placeholder="Ví dụ: Số 45 ngõ 12 đường Cầu Giấy"
                    />
                  </div>

                  {fullAddress && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      📍 <strong>Địa chỉ giao:</strong> {fullAddress}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Danh sách sản phẩm */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sản phẩm xuất bán</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductLines lines={lines} onChange={setLines} checkStock priceLabel="Giá bán" />
              </CardContent>
            </Card>

            {/* 3. Vận chuyển & GHN Options */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Cấu hình vận chuyển</span>
                  {carrierType === "GHN" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Truck className="h-3.5 w-3.5" /> GHN Sandbox Connected
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setCarrierType("GHN")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "GHN"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-primary" /> Giao Hàng Nhanh
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tự động tính cước & tạo mã vận đơn GHN
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrierType("STORE")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "STORE"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Nhận tại cửa hàng</div>
                    <p className="text-xs text-muted-foreground mt-1">Khách lấy trực tiếp tại quầy (0 ₫)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrierType("OTHER")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "OTHER"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Đơn vị khác</div>
                    <p className="text-xs text-muted-foreground mt-1">Tự nhập phí vận chuyển</p>
                  </button>
                </div>

                {carrierType === "GHN" ? (
                  <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Trọng lượng ước tính:</span>
                        <strong className="font-semibold">{formatNumber(estimatedWeight)} gram</strong>
                        <span className="text-xs text-muted-foreground">({totalItems} cuốn)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cước phí GHN:</span>
                        {isCalculatingFee ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Đang tính cước...
                          </span>
                        ) : (
                          <strong className="font-semibold text-primary text-base">
                            {formatCurrency(shippingFee)}
                          </strong>
                        )}
                      </div>
                    </div>

                    {ghnLeadTime && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ⏱️ Dự kiến giao hàng: <strong>{ghnLeadTime}</strong>
                      </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Lưu ý xem hàng của GHN</Label>
                        <Select
                          value={requiredNote}
                          onValueChange={(v: any) => setRequiredNote(v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CHOXEMHANGKHONGTHU">
                              Cho xem hàng, không cho thử (Khuyên dùng cho sách)
                            </SelectItem>
                            <SelectItem value="KHONGCHOXEMHANG">Không cho xem hàng</SelectItem>
                            <SelectItem value="CHOTHUHANG">Cho thử hàng</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Người trả cước vận chuyển</Label>
                        <Select
                          value={String(paymentTypeId)}
                          onValueChange={(v) => setPaymentTypeId(Number(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">Người nhận (Khách) trả cước</SelectItem>
                            <SelectItem value="1">Người gửi (Shop) trả cước</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={autoCreateGhnOrder}
                        onChange={(e) => setAutoCreateGhnOrder(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="font-medium">
                        Tự động đẩy đơn sang GHN lấy Mã vận đơn (Tracking Code) ngay khi tạo
                      </span>
                    </label>
                  </div>
                ) : carrierType === "OTHER" ? (
                  <div className="space-y-1.5 sm:w-1/2">
                    <Label htmlFor="manual-ship">Phí vận chuyển tùy chỉnh (₫)</Label>
                    <Input
                      id="manual-ship"
                      type="number"
                      min={0}
                      value={manualShippingFee}
                      onChange={(e) => setManualShippingFee(Number(e.target.value))}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">Chiết khấu giảm giá (₫)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="note">Ghi chú cho shipper & đóng gói</Label>
                    <Input
                      id="note"
                      value={customer.note}
                      onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                      placeholder="Ví dụ: Giao trước 17h, bọc xốp cẩn thận..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cột Tổng kết đơn hàng */}
          <Card className="h-fit shadow-none lg:sticky lg:top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tổng kết đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng số cuốn sách</span>
                <span className="font-medium tabular-nums">{formatNumber(totalItems)} cuốn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính tiền sách</span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Chiết khấu</span>
                <span className="tabular-nums text-emerald-600">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Phí ship {carrierType === "GHN" ? "(GHN)" : ""}
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <span className="font-semibold">Tổng thanh toán</span>
                <span className="font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>

              {carrierType === "GHN" && autoCreateGhnOrder && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <PackageCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Đơn sẽ được tự động đồng bộ sang GHN và xuất mã vận đơn để in tem dán gói hàng.</span>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo đơn & kết nối GHN...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Xác nhận tạo đơn hàng
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
