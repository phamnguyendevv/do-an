import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, Printer, Truck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockShipments, stepIndexByStatus, trackingSteps } from "@/mock/shipping";
import { store } from "@/services/store";
import { ghnApi } from "@/lib/ghn-api";
import { formatCurrency, formatDate } from "@/utils/format";
import { shippingStatusLabel, shippingStatusTone } from "@/utils/status";

export const Route = createFileRoute("/shipping/$shippingId")({
  loader: ({ params }) => {
    const allShipments = [...store.getSnapshot().shipments, ...mockShipments];
    const shipment = allShipments.find((s) => s.id === params.shippingId);
    if (!shipment) throw notFound();
    return { shipment };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Không tìm thấy vận đơn — BookStock" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `Vận đơn ${loaderData.shipment.orderId} — BookStock` },
        { name: "description", content: `Tiến trình giao hàng của đơn ${loaderData.shipment.orderId}.` },
        { property: "og:title", content: `Vận đơn ${loaderData.shipment.orderId} — BookStock` },
        { property: "og:description", content: "Theo dõi tiến trình giao hàng chi tiết." },
      ],
    };
  },
  component: ShippingDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ShippingDetailPage() {
  const { shipment } = Route.useLoaderData();
  const activeIndex = stepIndexByStatus[shipment.status] ?? 0;
  const failed = shipment.status === "FAILED" || shipment.status === "RETURNED";
  const isGhn = shipment.carrier.includes("GHN") || shipment.trackingNumber.startsWith("GHN") || shipment.trackingNumber.length >= 6;

  const handlePrintGhn = async () => {
    try {
      const res = await ghnApi.getPrintToken([shipment.trackingNumber]);
      if (res?.printUrl) {
        window.open(res.printUrl, "_blank");
      } else {
        toast.error("Không thể tạo link in tem từ GHN");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo token in tem GHN");
    }
  };

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vận chuyển", href: "/shipping" },
        { label: shipment.orderId },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/shipping">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại vận chuyển
          </Link>
        </Button>

        <PageHeader
          title={`Vận đơn ${shipment.trackingNumber}`}
          description={`${shipment.carrier} · Đơn ${shipment.orderId}`}
          actions={
            <div className="flex items-center gap-2">
              {isGhn ? (
                <>
                  <Button size="sm" variant="default" onClick={handlePrintGhn}>
                    <Printer className="mr-1.5 h-4 w-4" /> In tem vận đơn GHN
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
              <Button size="sm" variant="outline" asChild>
                <Link to="/orders/$orderId" params={{ orderId: shipment.orderId }}>
                  Xem đơn hàng
                </Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tiến trình giao hàng</CardTitle>
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
                          !done && "border-border bg-muted text-muted-foreground",
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

          <Card className="h-fit shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Thông tin vận đơn</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Trạng thái" value={<StatusBadge tone={shippingStatusTone[shipment.status]}>{shippingStatusLabel[shipment.status]}</StatusBadge>} />
              <Row label="Khách hàng" value={shipment.customerName} />
              <Row label="Đơn vị vận chuyển" value={shipment.carrier} />
              <Row label="Mã vận đơn" value={<span className="font-mono text-xs">{shipment.trackingNumber}</span>} />
              <Row label="Phí vận chuyển" value={formatCurrency(shipment.shippingFee)} />
              <Row label="Dự kiến giao" value={formatDate(shipment.expectedDelivery)} />
              <div className="py-2.5 text-sm">
                <p className="text-muted-foreground">Địa chỉ giao</p>
                <p className="mt-1 font-medium">{shipment.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
