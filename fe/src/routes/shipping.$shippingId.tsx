import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Printer,
  RefreshCw,
  Truck,
  XCircle,
  PackageCheck,
  PackageX,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { store } from "@/services/store";
import { orderService } from "@/services/order-service";
import { ghnApi, mapGhnStatus } from "@/lib/ghn-api";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import {
  shippingStatusLabel,
  shippingStatusTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/utils/status";
import { trackingSteps, stepIndexByStatus } from "@/mock/shipping";
import type { OrderStatus } from "@/types";

export const Route = createFileRoute("/shipping/$shippingId")({
  loader: ({ params }) => {
    const { shipments, orders } = store.getSnapshot();
    const shipment = shipments.find((s) => s.id === params.shippingId);
    if (!shipment) {
      // Try to find auto-generated shipment from orders
      const orderId = params.shippingId.replace("SHP-auto-", "");
      const order = orders.find((o) => o.id === orderId || o.orderCode === orderId);
      if (!order) throw notFound();
      return {
        shipment: {
          id: params.shippingId,
          orderId: order.id,
          customerName: order.customerName,
          carrier: order.shippingMethod || "Giao Hàng Nhanh (GHN)",
          trackingNumber: order.trackingCode || "",
          shippingFee: order.shippingFee || 0,
          expectedDelivery: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          status: (order.status === "DELIVERED"
            ? "DELIVERED"
            : order.status === "CANCELLED"
            ? "RETURNED"
            : order.status === "SHIPPING"
            ? "OUT_FOR_DELIVERY"
            : order.status === "PREPARING"
            ? "PICKED_UP"
            : "WAITING_PICKUP") as import("@/types").ShippingStatus,
          address: order.customerAddress,
        },
        order,
      };
    }
    const order = orders.find((o) => o.id === shipment.orderId || o.orderCode === shipment.orderId);
    return { shipment, order: order ?? null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Không tìm thấy vận đơn — BookStock" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `Vận đơn ${loaderData.shipment.trackingNumber || loaderData.shipment.orderId} — BookStock` },
        {
          name: "description",
          content: `Tiến trình giao hàng của đơn ${loaderData.shipment.orderId}.`,
        },
        {
          property: "og:title",
          content: `Vận đơn ${loaderData.shipment.orderId} — BookStock`,
        },
        {
          property: "og:description",
          content: "Theo dõi tiến trình giao hàng chi tiết.",
        },
      ],
    };
  },
  component: ShippingDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Map GHN raw log status to Vietnamese label */
function ghnLogLabel(status: string): string {
  const map: Record<string, string> = {
    ready_to_pick: "Chờ lấy hàng",
    picking: "Đang lấy hàng",
    picked: "Đã lấy hàng",
    storing: "Đang lưu kho",
    transporting: "Đang vận chuyển",
    sorting: "Đang phân loại",
    delivering: "Đang giao đến khách",
    delivery_fail: "Giao thất bại",
    delivered: "Giao thành công",
    return: "Đang hoàn hàng",
    return_transporting: "Đang vận chuyển hoàn",
    return_sorting: "Phân loại hoàn",
    returned: "Đã hoàn hàng",
    exception: "Ngoại lệ",
    damage: "Hàng bị hư hỏng",
    lost: "Thất lạc",
    cancel: "Đã hủy",
  };
  return map[status?.toLowerCase()] ?? status;
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "RETURNED", label: "Hoàn hàng" },
];

function ShippingDetailPage() {
  const { shipment, order } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const activeIndex = stepIndexByStatus[shipment.status] ?? 0;
  const failed = shipment.status === "FAILED" || shipment.status === "RETURNED";
  const isGhn =
    (shipment.carrier?.includes("GHN") ?? false) ||
    (shipment.trackingNumber?.startsWith("GHN") ?? false) ||
    ((shipment.trackingNumber?.length ?? 0) >= 6 && !shipment.trackingNumber?.startsWith("VN"));

  const hasTracking = isGhn && shipment.trackingNumber;

  // Query GHN status realtime
  const {
    data: ghnDetail,
    isLoading: isLoadingGhn,
    isFetching: isFetchingGhn,
    refetch: refetchGhn,
    error: ghnError,
  } = useQuery({
    queryKey: ["ghn-order-detail", shipment.trackingNumber],
    queryFn: async () => {
      if (!hasTracking) return null;
      return ghnApi.getOrderDetail(shipment.trackingNumber!);
    },
    enabled: !!hasTracking,
    staleTime: 30_000,
    retry: 1,
  });

  const handlePrintGhn = async () => {
    try {
      const res = await ghnApi.getPrintToken([shipment.trackingNumber!]);
      if (res?.printUrl) {
        window.open(res.printUrl, "_blank");
      } else {
        toast.error("Không thể tạo link in tem từ GHN");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo token in tem GHN");
    }
  };

  const handleCancelGhn = async () => {
    if (!shipment.trackingNumber) return;
    try {
      await ghnApi.cancelOrder([shipment.trackingNumber]);
      toast.success(`Đã gửi yêu cầu hủy vận đơn ${shipment.trackingNumber} trên GHN`);
      refetchGhn();
    } catch (err: any) {
      toast.error(err.message || "Không thể hủy vận đơn trên GHN");
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!order || !nextStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await orderService.updateStatus(order.id, nextStatus);
      if (!res.ok) {
        toast.error(res.error ?? "Không thể cập nhật trạng thái đơn hàng");
      } else {
        toast.success(
          `Đơn ${order.orderCode || order.id} → ${orderStatusLabel[nextStatus]}`,
          {
            description:
              nextStatus === "CANCELLED" || nextStatus === "RETURNED"
                ? "Số lượng đã được hoàn lại kho."
                : undefined,
          }
        );
        queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
        setNextStatus("");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Sync GHN status automatically to order if differs
  const ghnMappedStatus = ghnDetail?.status ? mapGhnStatus(ghnDetail.status) : null;

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vận chuyển", href: "/shipping" },
        { label: shipment.trackingNumber || shipment.orderId },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/shipping">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại vận chuyển
          </Link>
        </Button>

        <PageHeader
          title={
            shipment.trackingNumber
              ? `Vận đơn ${shipment.trackingNumber}`
              : `Đơn ${shipment.orderId}`
          }
          description={`${shipment.carrier} · Đơn ${order?.orderCode || shipment.orderId}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {isGhn && shipment.trackingNumber ? (
                <>
                  <Button size="sm" variant="default" onClick={handlePrintGhn}>
                    <Printer className="mr-1.5 h-4 w-4" /> In tem GHN
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`https://tracking.ghn.vn/?order_code=${shipment.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" /> Tra cứu GHN
                    </a>
                  </Button>
                </>
              ) : null}
              {order ? (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                    Xem đơn hàng
                  </Link>
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* LEFT: GHN Real-time Timeline */}
          <div className="space-y-4 lg:col-span-2">
            {/* GHN Live Status Card */}
            {hasTracking && (
              <Card className="shadow-none border-emerald-200/70 dark:border-emerald-900/50">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    <span>Trạng thái GHN thực tế</span>
                    {ghnDetail?.status && (
                      <StatusBadge tone={shippingStatusTone[ghnMappedStatus!]}>
                        {ghnDetail.status_name || ghnLogLabel(ghnDetail.status)}
                      </StatusBadge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                    disabled={isFetchingGhn}
                    onClick={() => refetchGhn()}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isFetchingGhn && "animate-spin")} />
                    Làm mới
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingGhn ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Đang tải trạng thái từ GHN...
                    </div>
                  ) : ghnError ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Không thể lấy dữ liệu từ GHN:{" "}
                        {(ghnError as any)?.message || "Lỗi kết nối GHN Sandbox"}
                      </span>
                    </div>
                  ) : ghnDetail ? (
                    <div className="space-y-3">
                      {/* Log timeline from GHN */}
                      {ghnDetail.log && ghnDetail.log.length > 0 ? (
                        <ol className="relative space-y-3 pl-7">
                          <span className="absolute left-[10px] top-1.5 h-[calc(100%-12px)] w-px bg-border" />
                          {[...ghnDetail.log].reverse().map((log, i) => {
                            const isFirst = i === 0;
                            return (
                              <li key={i} className="relative">
                                <span
                                  className={cn(
                                    "absolute -left-7 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[9px]",
                                    isFirst
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-border bg-muted text-muted-foreground"
                                  )}
                                >
                                  {isFirst ? <Check className="h-2.5 w-2.5" /> : null}
                                </span>
                                <div>
                                  <p
                                    className={cn(
                                      "text-sm font-medium",
                                      !isFirst && "text-muted-foreground"
                                    )}
                                  >
                                    {ghnLogLabel(log.status)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.updated_date
                                      ? formatDateTime(log.updated_date)
                                      : ""}
                                    {log.description ? ` — ${log.description}` : ""}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="py-2 text-sm text-muted-foreground">
                          Chưa có lịch sử cập nhật từ GHN.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-2 text-sm text-muted-foreground">
                      Nhập mã vận đơn GHN để tra cứu trạng thái thực tế.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Internal tracking progress */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tiến trình đơn hàng nội bộ</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-6 pl-8">
                  <span className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-px bg-border" />
                  {trackingSteps.map((step, i) => {
                    const done = i <= activeIndex;
                    const isCurrent = i === activeIndex;
                    return (
                      <li key={step.key} className="relative">
                        <span
                          className={cn(
                            "absolute -left-8 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[10px]",
                            done && !failed && "border-success bg-success text-success-foreground",
                            done && failed && isCurrent && "border-destructive bg-destructive text-destructive-foreground",
                            done && failed && !isCurrent && "border-success bg-success text-success-foreground",
                            !done && "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          {done ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>
                          {isCurrent && failed ? shippingStatusLabel[shipment.status] : step.label}
                        </p>
                        {done ? (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(shipment.expectedDelivery)}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            {/* Update order status panel */}
            {order && (
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    Cập nhật trạng thái đơn hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Trạng thái hiện tại:</span>
                    <StatusBadge tone={orderStatusTone[order.status]}>
                      {orderStatusLabel[order.status]}
                    </StatusBadge>
                  </div>

                  {/* Quick action buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Thao tác nhanh
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setNextStatus("CONFIRMED");
                            setTimeout(() => {
                              orderService.updateStatus(order.id, "CONFIRMED").then((res) => {
                                if (res.ok) {
                                  toast.success(`Đã xác nhận đơn ${order.orderCode || order.id}`);
                                  queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                                } else {
                                  toast.error(res.error ?? "Lỗi cập nhật trạng thái");
                                }
                              });
                            }, 0);
                          }}
                          className="gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Xác nhận đơn
                        </Button>
                      )}
                      {order.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            orderService.updateStatus(order.id, "PREPARING").then((res) => {
                              if (res.ok) {
                                toast.success("Bắt đầu chuẩn bị hàng");
                                queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                              }
                            });
                          }}
                          className="gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Bắt đầu đóng gói
                        </Button>
                      )}
                      {order.status === "PREPARING" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            orderService.updateStatus(order.id, "SHIPPING").then((res) => {
                              if (res.ok) {
                                toast.success("Đơn hàng đang được vận chuyển");
                                queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                              }
                            });
                          }}
                          className="gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Bàn giao vận chuyển
                        </Button>
                      )}
                      {order.status === "SHIPPING" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            orderService.updateStatus(order.id, "DELIVERED").then((res) => {
                              if (res.ok) {
                                toast.success("Giao hàng thành công!");
                                queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                              }
                            });
                          }}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Xác nhận giao thành công
                        </Button>
                      )}
                      {["PENDING", "CONFIRMED", "PREPARING"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            orderService.updateStatus(order.id, "CANCELLED").then((res) => {
                              if (res.ok) {
                                toast.success("Đã hủy đơn hàng, tồn kho đã được hoàn lại");
                                queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                                if (hasTracking) {
                                  ghnApi.cancelOrder([shipment.trackingNumber!]).catch(() => {});
                                }
                              }
                            });
                          }}
                          className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Hủy đơn
                        </Button>
                      )}
                      {order.status === "DELIVERED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            orderService.updateStatus(order.id, "RETURNED").then((res) => {
                              if (res.ok) {
                                toast.success("Đã ghi nhận hoàn hàng, tồn kho đã được hoàn lại");
                                queryClient.invalidateQueries({ queryKey: ["orders", "live-list"] });
                              }
                            });
                          }}
                          className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-50"
                        >
                          <PackageX className="h-3.5 w-3.5" />
                          Ghi nhận hoàn hàng
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Manual status select */}
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hoặc chọn trạng thái thủ công
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={nextStatus}
                        onValueChange={(v) => setNextStatus(v as OrderStatus)}
                      >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue placeholder="Chọn trạng thái mới..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUS_OPTIONS.filter((o) => o.value !== order.status).map(
                            (opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!nextStatus || isUpdatingStatus}
                        onClick={handleUpdateOrderStatus}
                        className="shrink-0"
                      >
                        {isUpdatingStatus ? "Đang lưu..." : "Cập nhật"}
                      </Button>
                    </div>
                  </div>

                  {/* GHN cancel button */}
                  {hasTracking &&
                    ghnDetail?.status &&
                    !["delivered", "returned", "cancel"].includes(
                      ghnDetail.status.toLowerCase()
                    ) && (
                      <div className="border-t pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelGhn}
                          className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Hủy vận đơn trên GHN
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Info panel */}
          <div className="space-y-4">
            {/* GHN live info */}
            {ghnDetail && (
              <Card className="shadow-none border-emerald-200/60">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    Thông tin từ GHN
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y text-sm">
                  <Row
                    label="Trạng thái GHN"
                    value={
                      <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                        {ghnDetail.status_name || ghnDetail.status}
                      </span>
                    }
                  />
                  {ghnDetail.expected_delivery_time && (
                    <Row
                      label="Giao dự kiến"
                      value={formatDate(ghnDetail.expected_delivery_time)}
                    />
                  )}
                  {ghnDetail.total_fee != null && (
                    <Row label="Phí GHN" value={formatCurrency(Number(ghnDetail.total_fee))} />
                  )}
                  {ghnDetail.cod_amount != null && (
                    <Row label="Thu hộ COD" value={formatCurrency(Number(ghnDetail.cod_amount))} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Static shipment info */}
            <Card className="h-fit shadow-none">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Thông tin vận đơn</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <Row
                  label="Trạng thái"
                  value={
                    <StatusBadge tone={shippingStatusTone[shipment.status]}>
                      {shippingStatusLabel[shipment.status]}
                    </StatusBadge>
                  }
                />
                <Row label="Khách hàng" value={shipment.customerName} />
                <Row label="Đơn vị vận chuyển" value={shipment.carrier} />
                <Row
                  label="Mã vận đơn"
                  value={
                    <span className="font-mono text-xs">
                      {shipment.trackingNumber || "—"}
                    </span>
                  }
                />
                <Row
                  label="Phí vận chuyển"
                  value={formatCurrency(shipment.shippingFee)}
                />
                <Row label="Dự kiến giao" value={formatDate(shipment.expectedDelivery)} />
                <div className="py-2.5 text-sm">
                  <p className="text-muted-foreground">Địa chỉ giao</p>
                  <p className="mt-1 font-medium">{shipment.address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order info quick summary */}
            {order && (
              <Card className="shadow-none">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Đơn hàng liên kết</CardTitle>
                </CardHeader>
                <CardContent className="divide-y text-sm">
                  <Row
                    label="Mã đơn"
                    value={
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: order.id }}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {order.orderCode || order.id}
                      </Link>
                    }
                  />
                  <Row
                    label="Trạng thái đơn"
                    value={
                      <StatusBadge tone={orderStatusTone[order.status]}>
                        {orderStatusLabel[order.status]}
                      </StatusBadge>
                    }
                  />
                  <Row label="Tổng tiền" value={formatCurrency(order.total)} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
