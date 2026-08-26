import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Truck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockOrders } from "@/mock/orders";
import { mockShipments } from "@/mock/shipping";
import { useOrders, useShipments } from "@/hooks/use-store";
import { orderService, orderTransitions } from "@/services/order-service";
import type { Order, OrderStatus } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { orderStatusLabel, orderStatusTone, paymentLabel, paymentTone } from "@/utils/status";

export const Route = createFileRoute("/orders/$orderId")({
  loader: ({ params }) => {
    const order = mockOrders.find((o) => o.id === params.orderId);
    if (!order) throw notFound();
    const shipment = mockShipments.find((s) => s.orderId === order.id) ?? null;
    return { order, shipment };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Không tìm thấy đơn hàng — BookStock" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `Đơn ${loaderData.order.id} — BookStock` },
        { name: "description", content: `Chi tiết đơn hàng ${loaderData.order.id} của ${loaderData.order.customerName}.` },
        { property: "og:title", content: `Đơn ${loaderData.order.id} — BookStock` },
        { property: "og:description", content: "Chi tiết sản phẩm, thanh toán và vận chuyển của đơn hàng." },
      ],
    };
  },
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const loaded = Route.useLoaderData();
  const orders = useOrders();
  const shipments = useShipments();
  const order = orders.find((o) => o.id === loaded.order.id) ?? loaded.order;
  const shipment = shipments.find((s) => s.orderId === order.id) ?? loaded.shipment;

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đơn hàng", href: "/orders" },
        { label: order.id },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại đơn hàng
          </Link>
        </Button>

        <PageHeader
          title={`Đơn hàng ${order.id}`}
          description={`Tạo lúc ${formatDateTime(order.createdAt)}`}
          actions={
            shipment ? (
              <Button size="sm" variant="outline" asChild>
                <Link to="/shipping/$shippingId" params={{ shippingId: shipment.id }}>
                  <Truck className="mr-1.5 h-4 w-4" /> Theo dõi vận chuyển
                </Link>
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={orderStatusTone[order.status]}>{orderStatusLabel[order.status]}</StatusBadge>
          <StatusBadge tone={paymentTone[order.payment]}>{paymentLabel[order.payment]}</StatusBadge>
          <StatusBadge tone="info">{order.shippingMethod}</StatusBadge>
        </div>

        <OrderWorkflow order={order} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sản phẩm</CardTitle>
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
                      <TableCell className="text-right tabular-nums">{formatCurrency(it.price)}</TableCell>
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
                <CardTitle className="text-base">Khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.customerPhone}</p>
                <p className="text-muted-foreground">{order.customerAddress}</p>
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
      </PageContainer>
    </AppShell>
  );
}

function OrderWorkflow({ order }: { order: Order }) {
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const nextStates = orderTransitions[order.status];

  const move = async (next: OrderStatus) => {
    setPending(next);
    const res = await orderService.updateStatus(order.id, next);
    setPending(null);
    if (!res.ok) toast.error(res.error ?? "Không thể cập nhật trạng thái");
    else
      toast.success(`Đơn ${order.id} → ${orderStatusLabel[next]}`, {
        description:
          next === "CANCELLED" || next === "RETURNED"
            ? "Số lượng đã được hoàn lại kho."
            : undefined,
      });
  };

  const markPaid = async () => {
    const res = await orderService.updatePayment(order.id, "PAID");
    if (res.ok) toast.success("Đã ghi nhận thanh toán");
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
          <Button size="sm" variant="outline" onClick={markPaid}>
            Đánh dấu đã thanh toán
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
