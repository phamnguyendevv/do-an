import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Loader2, Package, QrCode, Truck, User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SepayPaymentDialog } from "@/components/orders/sepay-payment-dialog";
import { OrderTimeline } from "@/components/orders/order-timeline";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { store } from "@/services/store";
import { useOrders, useShipments } from "@/hooks/use-store";
import { orderService, orderTransitions } from "@/services/order-service";
import type { Order, OrderStatus } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { orderStatusLabel, orderStatusTone, paymentLabel, paymentTone } from "@/utils/status";
import { orderApi } from "@/lib/order-api";
import { ghnApi, type GhnDistrict, type GhnProvince, type GhnWard } from "@/lib/ghn-api";
import type { PaymentStatus } from "@/types";

export const Route = createFileRoute("/orders/$orderId")({
  loader: async ({ params }) => {
    const { orders, shipments } = store.getSnapshot();
    let order = orders.find((o) => o.id === params.orderId || o.orderCode === params.orderId);
    if (!order) {
      try {
        const fetched = await orderApi.get(params.orderId);
        if (fetched) {
          order = {
            id: String(fetched.id),
            orderCode: fetched.orderCode,
            customerName: fetched.customerName,
            customerPhone: fetched.customerPhone,
            customerAddress: fetched.customerAddress,
            provinceId: fetched.provinceId,
            districtId: fetched.districtId,
            wardCode: fetched.wardCode,
            items: (fetched.items || []).map((it) => ({
              bookId: String(it.bookId),
              title: it.title,
              quantity: it.quantity,
              price: Number(it.price),
            })),
            subtotal: Number(fetched.subtotal),
            discount: Number(fetched.discount),
            shippingFee: Number(fetched.shippingFee),
            total: Number(fetched.total),
            payment: fetched.payment as PaymentStatus,
            shippingMethod: fetched.shippingMethod,
            trackingCode: fetched.trackingCode,
            note: fetched.note,
            status: fetched.status as OrderStatus,
            createdAt:
              typeof fetched.createdAt === "string"
                ? fetched.createdAt
                : new Date(fetched.createdAt ?? Date.now()).toISOString(),
          };
          store.setState({ orders: [order, ...orders.filter((o) => o.id !== order!.id)] });
        }
      } catch {
        // Order not found in backend either
      }
    }
    if (!order) throw notFound();
    const shipment =
      shipments.find((s) => s.orderId === order!.id || s.orderId === order!.orderCode) ?? null;
    return { order, shipment };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Không tìm thấy đơn hàng — BookStock" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const code = loaderData.order.orderCode || loaderData.order.id;
    return {
      meta: [
        { title: `Đơn ${code} — BookStock` },
        {
          name: "description",
          content: `Chi tiết đơn hàng ${code} của ${loaderData.order.customerName}.`,
        },
        { property: "og:title", content: `Đơn ${code} — BookStock` },
        {
          property: "og:description",
          content: "Chi tiết sản phẩm, thanh toán và vận chuyển của đơn hàng.",
        },
      ],
    };
  },
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const loaded = Route.useLoaderData();
  const orders = useOrders();
  const shipments = useShipments();
  const order =
    orders.find(
      (o) =>
        o.id === loaded.order.id ||
        o.orderCode === loaded.order.orderCode ||
        o.id === loaded.order.orderCode ||
        o.orderCode === loaded.order.id,
    ) ?? loaded.order;
  const shipment =
    shipments.find((s) => s.orderId === order.id || s.orderId === order.orderCode) ??
    loaded.shipment;

  const [editOpen, setEditOpen] = useState(false);

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đơn hàng", href: "/orders" },
        { label: order.orderCode || order.id },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại đơn hàng
          </Link>
        </Button>

        <PageHeader
          title={`Đơn hàng ${order.orderCode || order.id}`}
          description={`Tạo lúc ${formatDateTime(order.createdAt)}`}
          actions={
            <div className="flex items-center gap-2">
              {order.status === "PENDING" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
                >
                  <Edit2 className="h-4 w-4" />
                  Sửa đơn hàng
                </Button>
              )}
              {shipment ? (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/shipping/$shippingId" params={{ shippingId: shipment.id }}>
                    <Truck className="mr-1.5 h-4 w-4" /> Theo dõi vận chuyển
                  </Link>
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={orderStatusTone[order.status]}>
            {orderStatusLabel[order.status]}
          </StatusBadge>
          <StatusBadge tone={paymentTone[order.payment]}>{paymentLabel[order.payment]}</StatusBadge>
          <StatusBadge tone="info">{order.shippingMethod}</StatusBadge>
          {order.trackingCode && <StatusBadge tone="info">GHN: {order.trackingCode}</StatusBadge>}
        </div>

        <OrderWorkflow order={order} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" /> Sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sách</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((it) => (
                    <TableRow key={it.bookId}>
                      <TableCell className="font-medium">{it.title}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(it.price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(it.price * it.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" /> Khách hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.customerPhone}</p>
                <p className="text-muted-foreground">{order.customerAddress}</p>
                {order.note && (
                  <p className="mt-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
                    📝 {order.note}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chiết khấu</span>
                  <span className="tabular-nums">-{formatCurrency(order.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span className="tabular-nums">{formatCurrency(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Tổng cộng</span>
                  <span className="tabular-nums">{formatCurrency(order.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lịch sử đơn hàng & Nhật ký xử lý (Audit Log Timeline) */}
        <OrderTimeline order={order} />

        {/* Sheet chỉnh sửa đơn hàng PENDING */}
        <EditOrderSheet order={order} open={editOpen} onOpenChange={setEditOpen} />
      </PageContainer>
    </AppShell>
  );
}

// ─── Edit Order Sheet ──────────────────────────────────────────────────────────

interface EditOrderSheetProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditOrderSheet({ order, open, onOpenChange }: EditOrderSheetProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerName: order.customerName ?? "",
    customerPhone: order.customerPhone ?? "",
    customerAddress: order.customerAddress ?? "",
    note: order.note ?? "",
    provinceId: order.provinceId ? String(order.provinceId) : "",
    districtId: order.districtId ? String(order.districtId) : "",
    wardCode: order.wardCode ?? "",
    weight: 300,
    length: 20,
    width: 15,
    height: 10,
    insuranceValue: order.subtotal ?? 0,
    paymentTypeId: "2" as "1" | "2",
    requiredNote: "CHOXEMHANGKHONGTHU" as "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG",
    content: order.items.map((i) => `${i.title} x${i.quantity}`).join(", "),
  });

  const hasGhn = !!order.trackingCode;

  // Lấy chi tiết đơn trực tiếp từ GHN Sandbox khi mở Sheet
  const { data: ghnDetail } = useQuery({
    queryKey: ["ghn-order-detail", order.trackingCode],
    queryFn: async () => {
      if (!order.trackingCode) return null;
      try {
        return await ghnApi.getOrderDetail(order.trackingCode);
      } catch {
        return null;
      }
    },
    enabled: hasGhn && open,
    staleTime: 30_000,
  });

  // Reset/Cập nhật form khi mở sheet hoặc khi dữ liệu GHN tải về
  useEffect(() => {
    if (open) {
      setForm({
        customerName: ghnDetail?.to_name || order.customerName || "",
        customerPhone: ghnDetail?.to_phone || order.customerPhone || "",
        customerAddress: ghnDetail?.to_address || order.customerAddress || "",
        note: ghnDetail?.note !== undefined ? ghnDetail.note : order.note || "",
        provinceId: order.provinceId ? String(order.provinceId) : "",
        districtId: ghnDetail?.to_district_id
          ? String(ghnDetail.to_district_id)
          : order.districtId
            ? String(order.districtId)
            : "",
        wardCode: ghnDetail?.to_ward_code
          ? String(ghnDetail.to_ward_code)
          : order.wardCode
            ? String(order.wardCode)
            : "",
        weight: ghnDetail?.weight || 300,
        length: ghnDetail?.length || 20,
        width: ghnDetail?.width || 15,
        height: ghnDetail?.height || 10,
        insuranceValue: ghnDetail?.insurance_value ?? order.subtotal ?? 0,
        paymentTypeId: ghnDetail?.payment_type_id === 1 ? "1" : "2",
        requiredNote: ((ghnDetail as any)?.required_note as any) || "CHOXEMHANGKHONGTHU",
        content:
          ghnDetail?.content || order.items.map((i) => `${i.title} x${i.quantity}`).join(", "),
      });
    }
  }, [open, ghnDetail, order]);

  // GHN provinces
  const { data: provinces = [] } = useQuery<GhnProvince[]>({
    queryKey: ["ghn-provinces"],
    queryFn: async () => {
      try {
        return await ghnApi.getProvinces();
      } catch {
        return [];
      }
    },
    staleTime: 300_000,
    enabled: open,
  });

  // GHN districts khi chọn tỉnh
  const { data: districts = [], isLoading: loadingDistricts } = useQuery<GhnDistrict[]>({
    queryKey: ["ghn-districts", form.provinceId],
    queryFn: async () => {
      if (!form.provinceId) return [];
      try {
        return await ghnApi.getDistricts(Number(form.provinceId));
      } catch {
        return [];
      }
    },
    enabled: !!form.provinceId && open,
    staleTime: 300_000,
  });

  // GHN wards khi chọn huyện
  const { data: wards = [], isLoading: loadingWards } = useQuery<GhnWard[]>({
    queryKey: ["ghn-wards", form.districtId],
    queryFn: async () => {
      if (!form.districtId) return [];
      try {
        return await ghnApi.getWards(Number(form.districtId));
      } catch {
        return [];
      }
    },
    enabled: !!form.districtId && open,
    staleTime: 300_000,
  });

  // Tên địa chỉ đã chọn
  const selectedProvinceName = useMemo(
    () => provinces.find((p) => String(p.ProvinceID) === form.provinceId)?.ProvinceName,
    [provinces, form.provinceId],
  );
  const selectedDistrictName = useMemo(
    () => districts.find((d) => String(d.DistrictID) === form.districtId)?.DistrictName,
    [districts, form.districtId],
  );
  const selectedWardName = useMemo(
    () => wards.find((w) => w.WardCode === form.wardCode)?.WardName,
    [wards, form.wardCode],
  );

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      toast.error("Vui lòng nhập tên và số điện thoại khách hàng.");
      return;
    }

    setSaving(true);
    try {
      // Ghép địa chỉ chi tiết nếu có chọn Tỉnh/Huyện
      let fullAddress = form.customerAddress;
      if (selectedDistrictName && selectedProvinceName) {
        fullAddress = [
          form.customerAddress,
          selectedWardName,
          selectedDistrictName,
          selectedProvinceName,
        ]
          .filter(Boolean)
          .join(", ");
      }

      const res = await orderService.updateOrderInfo(
        order.id,
        {
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerAddress: fullAddress,
          note: form.note,
          toWardCode: form.wardCode || undefined,
          toDistrictId: form.districtId ? Number(form.districtId) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          length: form.length ? Number(form.length) : undefined,
          width: form.width ? Number(form.width) : undefined,
          height: form.height ? Number(form.height) : undefined,
          insuranceValue: form.insuranceValue ? Number(form.insuranceValue) : undefined,
          paymentTypeId: (Number(form.paymentTypeId) || 2) as 1 | 2,
          requiredNote: form.requiredNote,
          content: form.content.trim() || undefined,
        },
        order.trackingCode,
      );

      if (!res.ok) {
        toast.error(res.error ?? "Không thể cập nhật đơn hàng.");
        return;
      }

      // Làm tươi dữ liệu React Query
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (order.trackingCode) {
        await queryClient.invalidateQueries({
          queryKey: ["ghn-order-detail", order.trackingCode],
        });
      }

      if (hasGhn) {
        toast.success("Cập nhật đơn hàng thành công!", {
          description: "Thông tin đã được đồng bộ lên GHN Sandbox và lưu vào hệ thống.",
        });
      } else {
        toast.success("Cập nhật đơn hàng thành công!");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Lỗi khi cập nhật: " + (e?.message ?? "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Edit2 className="h-4 w-4 text-blue-500" />
            Sửa đơn hàng {order.orderCode || order.id}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Chỉ khả dụng khi đơn ở trạng thái <strong>Chờ xử lý</strong>.
            {hasGhn && (
              <>
                {" "}
                Thay đổi sẽ được gửi trực tiếp lên <strong>GHN Sandbox</strong> (mã:{" "}
                {order.trackingCode}) và lưu vào hệ thống.
              </>
            )}
            {!hasGhn && " Thay đổi sẽ được lưu vào hệ thống nội bộ."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-5">
          {/* ── Danh sách sản phẩm trong đơn (Giữ nguyên) ── */}
          <section className="space-y-3 rounded-lg border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5 text-primary" /> Sản phẩm trong đơn (
                {order.items.length})
              </h3>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                ✓ Được giữ nguyên
              </span>
            </div>

            <div className="space-y-2">
              {order.items.map((it, idx) => (
                <div
                  key={it.bookId || idx}
                  className="flex items-center justify-between text-xs bg-background p-2.5 rounded-md border shadow-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium truncate text-foreground">{it.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(it.price)} × {it.quantity} cuốn
                    </p>
                  </div>
                  <div className="text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Tạm tính tiền sách:</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(order.shippingFee)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span>Chiết khấu:</span>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    -{formatCurrency(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-semibold text-foreground text-sm">
                <span>Tổng cộng:</span>
                <span className="text-primary tabular-nums font-bold">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </section>

          {/* ── Thông tin người nhận ── */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Thông tin người nhận
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-medium">
                  Họ tên <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs font-medium">
                  Số điện thoại <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-phone"
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  placeholder="0987654321"
                />
              </div>
            </div>

            {/* Địa chỉ GHN — Tỉnh & Huyện & Xã */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tỉnh / Thành phố</Label>
                <Select
                  value={form.provinceId}
                  onValueChange={(v) => {
                    set("provinceId", v);
                    set("districtId", "");
                    set("wardCode", "");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Chọn Tỉnh / TP" />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quận / Huyện</Label>
                <Select
                  value={form.districtId}
                  disabled={!form.provinceId || loadingDistricts}
                  onValueChange={(v) => {
                    set("districtId", v);
                    set("wardCode", "");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue
                      placeholder={loadingDistricts ? "Đang tải..." : "Chọn Quận / Huyện"}
                    />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phường / Xã</Label>
                <Select
                  value={form.wardCode}
                  disabled={!form.districtId || loadingWards}
                  onValueChange={(v) => set("wardCode", v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={loadingWards ? "Đang tải..." : "Chọn Phường / Xã"} />
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-address" className="text-xs font-medium">
                Địa chỉ chi tiết
              </Label>
              <Input
                id="edit-address"
                value={form.customerAddress}
                onChange={(e) => set("customerAddress", e.target.value)}
                placeholder="Số nhà, tên đường..."
              />
              {selectedDistrictName && selectedProvinceName && (
                <p className="text-[11px] text-muted-foreground">
                  →{" "}
                  {[
                    form.customerAddress,
                    selectedWardName,
                    selectedDistrictName,
                    selectedProvinceName,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-note" className="text-xs font-medium">
                Ghi chú cho shipper
              </Label>
              <Textarea
                id="edit-note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="VD: Gọi điện trước khi giao 30 phút"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </section>

          {/* ── Cài đặt vận chuyển GHN ── */}
          {hasGhn && (
            <section className="space-y-3 border-t pt-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Cài đặt vận chuyển GHN
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Loại ghi chú bắt buộc</Label>
                  <Select value={form.requiredNote} onValueChange={(v) => set("requiredNote", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHOXEMHANGKHONGTHU">Cho xem hàng không thử</SelectItem>
                      <SelectItem value="CHOTHUHANG">Cho thử hàng</SelectItem>
                      <SelectItem value="KHONGCHOXEMHANG">Không cho xem hàng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ai trả phí vận chuyển</Label>
                  <Select value={form.paymentTypeId} onValueChange={(v) => set("paymentTypeId", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Khách hàng trả (2)</SelectItem>
                      <SelectItem value="1">Shop trả (1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-content" className="text-xs font-medium">
                  Nội dung đơn hàng
                </Label>
                <Input
                  id="edit-content"
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder="VD: Sách giáo khoa x2, Từ điển x1"
                />
                <p className="text-[11px] text-muted-foreground">
                  💡 Nếu để trống, thông tin sản phẩm và nội dung đơn sẽ được giữ nguyên không thay
                  đổi.
                </p>
              </div>
            </section>
          )}

          {/* ── Thông tin hàng hoá (Trọng lượng & Kích thước) ── */}
          {hasGhn && (
            <section className="space-y-3 border-t pt-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Thông tin kiện hàng
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-insurance" className="text-xs font-medium">
                    Giá trị khai giá / Bảo hiểm (₫)
                  </Label>
                  <Input
                    id="edit-insurance"
                    type="number"
                    min={0}
                    max={5_000_000}
                    value={form.insuranceValue}
                    onChange={(e) => set("insuranceValue", Number(e.target.value))}
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground">Tối đa 5.000.000 ₫</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-weight" className="text-xs font-medium">
                    Trọng lượng (gram) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    min={1}
                    max={50_000}
                    value={form.weight || ""}
                    onChange={(e) => set("weight", Number(e.target.value))}
                    placeholder="300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-length" className="text-xs font-medium">
                    Dài (cm)
                  </Label>
                  <Input
                    id="edit-length"
                    type="number"
                    min={0}
                    max={200}
                    value={form.length || ""}
                    onChange={(e) => set("length", Number(e.target.value))}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-width" className="text-xs font-medium">
                    Rộng (cm)
                  </Label>
                  <Input
                    id="edit-width"
                    type="number"
                    min={0}
                    max={200}
                    value={form.width || ""}
                    onChange={(e) => set("width", Number(e.target.value))}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-height" className="text-xs font-medium">
                    Cao (cm)
                  </Label>
                  <Input
                    id="edit-height"
                    type="number"
                    min={0}
                    max={200}
                    value={form.height || ""}
                    onChange={(e) => set("height", Number(e.target.value))}
                    placeholder="10"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        <SheetFooter className="border-t pt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Edit2 className="h-3.5 w-3.5" />
                {hasGhn ? "Lưu & đồng bộ GHN" : "Lưu thay đổi"}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Order Workflow ────────────────────────────────────────────────────────────

function OrderWorkflow({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);
  const nextStates = orderTransitions[order.status];

  const move = async (next: OrderStatus) => {
    setPending(next);
    const res = await orderService.updateStatus(order.id, next);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error ?? "Không thể cập nhật trạng thái");
    } else {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Đơn ${order.orderCode || order.id} → ${orderStatusLabel[next]}`, {
        description:
          next === "CANCELLED" || next === "RETURNED"
            ? "Số lượng đã được hoàn lại kho."
            : undefined,
      });
    }
  };

  const markPaid = async () => {
    const res = await orderService.updatePayment(order.id, "PAID");
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã ghi nhận thanh toán");
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Xử lý đơn hàng</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {nextStates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Đơn hàng đã kết thúc vòng đời, không còn thao tác nào.
          </p>
        ) : (
          nextStates.map((next) => (
            <Button
              key={next}
              size="sm"
              variant={next === "CANCELLED" || next === "FAILED" ? "outline" : "default"}
              disabled={pending !== null}
              onClick={() => move(next)}
              className={next === "CANCELLED" || next === "FAILED" ? "text-destructive" : ""}
            >
              {pending === next ? "Đang xử lý..." : orderStatusLabel[next]}
            </Button>
          ))
        )}
        {order.payment === "UNPAID" ? (
          <>
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={() => setSepayDialogOpen(true)}
            >
              <QrCode className="h-3.5 w-3.5" /> Quét mã SePay QR
            </Button>
            <Button size="sm" variant="outline" onClick={markPaid}>
              Đánh dấu đã thanh toán
            </Button>
            <SepayPaymentDialog
              open={sepayDialogOpen}
              onOpenChange={setSepayDialogOpen}
              order={order}
              onPaymentSuccess={async () => {
                await queryClient.invalidateQueries({ queryKey: ["orders"] });
              }}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
