import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooks, useExportReceipts, useImportReceipts, useOrders } from "@/hooks/use-store";
import { analyzeWarehouse } from "@/services/warehouse-intel";
import { formatCompactCurrency, formatNumber } from "@/utils/format";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI kho sách — BookStock" },
      {
        name: "description",
        content:
          "Trợ lý AI phân tích tồn kho, tìm kiếm bằng ngôn ngữ tự nhiên, tạo báo cáo và chuẩn bị thao tác kho có xác nhận.",
      },
      { property: "og:title", content: "Trợ lý AI kho sách — BookStock" },
      {
        property: "og:description",
        content: "AI hỗ trợ nhân viên kho: phân tích, tra cứu, báo cáo và tạo thao tác.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const books = useBooks();
  const orders = useOrders();
  const imports = useImportReceipts();
  const exports = useExportReceipts();
  const intel = analyzeWarehouse({ books, orders, imports, exports });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Trợ lý AI kho sách"
          description="Hỏi đáp bằng ngôn ngữ tự nhiên, phân tích tồn kho, tạo báo cáo và chuẩn bị thao tác — mọi thay đổi dữ liệu đều cần bạn xác nhận."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AssistantChat />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="size-4 text-primary" /> Cảnh báo & đề xuất
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {intel.insights.length === 0 ? (
                  <p className="text-muted-foreground">Kho đang ổn định, chưa có cảnh báo nào.</p>
                ) : (
                  intel.insights.map((i) => (
                    <div key={i.title} className="space-y-1 border-l-2 pl-3" data-level={i.level}>
                      <p className="flex items-center gap-2 font-medium">
                        {i.level === "critical" ? (
                          <AlertTriangle className="size-4 text-destructive" />
                        ) : null}
                        {i.title}
                      </p>
                      <p className="text-muted-foreground">{i.detail}</p>
                      {i.action ? <p className="text-xs text-primary">{i.action}</p> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tổng quan nhanh</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Đầu sách" value={formatNumber(intel.totals.titles)} />
                <Stat label="Tồn kho" value={formatNumber(intel.totals.stock)} />
                <Stat
                  label="Giá trị tồn"
                  value={formatCompactCurrency(intel.totals.inventoryValue)}
                />
                <Stat label="Tồn > 90 ngày" value={formatNumber(intel.totals.aging90)} />
                <Stat label="Sắp hết" value={formatNumber(intel.totals.lowStock)} />
                <Stat label="Hết hàng" value={formatNumber(intel.totals.outOfStock)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4 text-success" /> Bán nhanh 30 ngày
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {intel.fastMovers.slice(0, 5).map((x) => (
                  <div key={x.book.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{x.book.title}</span>
                    <Badge variant="secondary">{x.sold}</Badge>
                  </div>
                ))}
                {intel.fastMovers.length === 0 ? (
                  <p className="text-muted-foreground">Chưa có dữ liệu bán.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="size-4 text-warning" /> Bán chậm / tồn đọng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {intel.slowMovers.slice(0, 5).map((x) => (
                  <div key={x.book.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{x.book.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatNumber(x.book.stock)} cuốn
                    </span>
                  </div>
                ))}
                {intel.slowMovers.length === 0 ? (
                  <p className="text-muted-foreground">Không có sách tồn đọng.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
