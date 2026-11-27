import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCw, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { activityLogApi, type ActivityLogApiItem } from "@/lib/activity-log-api";

export const Route = createFileRoute("/activity-logs")({ component: ActivityLogsPage });

function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useQuery({
    queryKey: ["activity-logs", page, pageSize, debouncedSearch],
    queryFn: () =>
      activityLogApi.list({
        page,
        size: pageSize,
        search: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const getActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("IMPORT")) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {action}
        </Badge>
      );
    }
    if (act.includes("UPDATE") || act.includes("CHANGE")) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {action}
        </Badge>
      );
    }
    if (act.includes("DELETE") || act.includes("CANCEL")) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
          {action}
        </Badge>
      );
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  const columns: DataTableColumn<ActivityLogApiItem>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      cell: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(r.createdAt).toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actorName",
      header: "Người thực hiện",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.actorName}</span>
          {r.actorRole && (
            <span className="text-[11px] text-muted-foreground">Vai trò: {r.actorRole}</span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Hành động",
      cell: (r) => getActionBadge(r.action),
    },
    {
      key: "resourceType",
      header: "Đối tượng",
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.resourceType}
          {r.resourceId ? ` #${r.resourceId}` : ""}
        </span>
      ),
    },
    {
      key: "description",
      header: "Chi tiết",
      cell: (r) => <span className="text-xs line-clamp-2">{r.description || "—"}</span>,
    },
    {
      key: "ipAddress",
      header: "IP",
      cell: (r) => (
        <span className="text-xs font-mono text-muted-foreground">{r.ipAddress || "—"}</span>
      ),
    },
  ];

  return (
    <AppShell requiredAbility={{ action: "read", subject: "ActivityLog" }}>
      <PageContainer>
        <PageHeader
          title="Lịch sử hoạt động"
          description="Theo dõi nhật ký thao tác và thay đổi dữ liệu trên toàn bộ hệ thống"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="gap-1.5"
            >
              <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          }
        />

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo người thực hiện hoặc nội dung..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <DataTable
          columns={columns}
          data={query.data?.data || []}
          rowKey={(r) => String(r.id)}
          loading={query.isLoading}
          serverPagination={{
            total: query.data?.pagination?.total || 0,
            page,
            pageSize,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          emptyTitle="Chưa có nhật ký hoạt động nào"
          emptyDescription="Các hành động tạo mới, cập nhật, xóa sẽ được ghi nhận tại đây."
        />
      </PageContainer>
    </AppShell>
  );
}
