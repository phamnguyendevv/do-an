import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Truck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import {
  DateRangePicker,
  inDateRange,
  type DateRange,
} from "@/components/shared/date-range-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShipments } from "@/hooks/use-store";
import { ghnApi } from "@/lib/ghn-api";
import { formatCurrency, formatDate } from "@/utils/format";
import { shippingStatusLabel, shippingStatusTone } from "@/utils/status";
import type { Shipping } from "@/types";

export const Route = createFileRoute("/shipping/")({
  head: () => ({
    meta: [
      { title: "Vận chuyển — BookStock" },
      {
        name: "description",
        content: "Danh sách vận đơn: đơn vị vận chuyển, mã tracking, phí và trạng thái giao hàng.",
      },
      { property: "og:title", content: "Vận chuyển — BookStock" },
      { property: "og:description", content: "Theo dõi toàn bộ vận đơn và tiến trình giao hàng." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const shipments = useShipments();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handlePrintGhn = async (trackingCode: string) => {
    try {
      const res = await ghnApi.getPrintToken([trackingCode]);
      if (res?.printUrl) {
        window.open(res.printUrl, "_blank");
      } else {
        toast.error("Không thể tạo link in tem từ GHN");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo token in tem GHN");
    }
  };

  const data = useMemo(
    () =>
      shipments.filter((s) => {
        const q = search.trim().toLowerCase();
        const orderId = (s.orderId || "").toLowerCase();
        const customerName = (s.customerName || "").toLowerCase();
        const trackingNumber = (s.trackingNumber || "").toLowerCase();
        const matchQ =
          !q || orderId.includes(q) || customerName.includes(q) || trackingNumber.includes(q);
        return (
          matchQ &&
          (status === "all" || s.status === status) &&
          inDateRange(s.expectedDelivery, dateRange)
        );
      }),
    [shipments, search, status, dateRange],
  );

  const columns: DataTableColumn<Shipping>[] = [
    {
      key: "orderId",
      header: "Mã đơn",
      sortable: true,
      value: (s) => s.orderId || "",
      cell: (s) => (
        <Link
          to="/shipping/$shippingId"
          params={{ shippingId: s.id }}
          className="font-mono text-xs hover:text-primary"
        >
          {s.orderId || "—"}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      sortable: true,
      value: (s) => s.customerName || "",
      cell: (s) => <span className="font-medium">{s.customerName || "—"}</span>,
    },
    {
      key: "carrier",
      header: "Đơn vị VC",
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-xs">
          {s.carrier?.includes("GHN") ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Truck className="h-3.5 w-3.5" /> GHN
            </span>
          ) : (
            <span>{s.carrier || "Tiêu chuẩn"}</span>
          )}
        </div>
      ),
    },
    {
      key: "tracking",
      header: "Mã vận đơn",
      cell: (s) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-foreground">
            {s.trackingNumber || "—"}
          </span>
          {s.carrier?.includes("GHN") && s.trackingNumber ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => handlePrintGhn(s.trackingNumber)}
              title="In tem vận đơn GHN A5 / 80x80"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
    {
      key: "fee",
      header: "Phí VC",
      align: "right",
      sortable: true,
      value: (s) => s.shippingFee,
      cell: (s) => <span className="tabular-nums">{formatCurrency(s.shippingFee)}</span>,
    },
    {
      key: "eta",
      header: "Dự kiến giao",
      align: "right",
      cell: (s) => <span className="text-muted-foreground">{formatDate(s.expectedDelivery)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (s) => (
        <StatusBadge tone={shippingStatusTone[s.status]}>
          {shippingStatusLabel[s.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Vận chuyển" }]}>
      <PageContainer>
        <PageHeader
          title="Vận chuyển"
          description={`${data.length}/${shipments.length} vận đơn đang theo dõi.`}
        />

        <DataTable
          columns={columns}
          data={data}
          rowKey={(s) => s.id}
          emptyTitle="Chưa có vận đơn nào"
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-72"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm mã đơn, khách hàng, tracking..."
              />
              <DateRangePicker
                value={dateRange}
                onValueChange={setDateRange}
                placeholder="Lọc theo ngày giao dự kiến"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {Object.entries(shippingStatusLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBar>
          }
          rowActions={(s) => (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/shipping/$shippingId" params={{ shippingId: s.id }}>
                Chi tiết
              </Link>
            </Button>
          )}
        />
      </PageContainer>
    </AppShell>
  );
}
