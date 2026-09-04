import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table'
import { Input } from '@/components/ui/input'
import { activityLogApi, type ActivityLogApiItem } from '@/lib/activity-log-api'

export const Route = createFileRoute('/activity-logs')({ component: ActivityLogsPage })
function ActivityLogsPage() {
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['activity-logs', search], queryFn: () => activityLogApi.list({ search, size: 100 }) })
  const columns: DataTableColumn<ActivityLogApiItem>[] = [{ key: 'createdAt', header: 'Thời gian', cell: (r) => new Date(r.createdAt).toLocaleString('vi-VN') }, { key: 'actorName', header: 'Người thực hiện', cell: (r) => r.actorName }, { key: 'action', header: 'Hành động', cell: (r) => r.action }, { key: 'resourceType', header: 'Đối tượng', cell: (r) => `${r.resourceType}${r.resourceId ? ` #${r.resourceId}` : ''}` }, { key: 'description', header: 'Chi tiết', cell: (r) => r.description || '-' }, { key: 'ipAddress', header: 'IP', cell: (r) => r.ipAddress || '-' }]
  return <AppShell><PageContainer><PageHeader title="Lịch sử hoạt động" description="Theo dõi thao tác trên hệ thống" /><Input className="mb-4" placeholder="Tìm người thực hiện hoặc nội dung" value={search} onChange={(e) => setSearch(e.target.value)} /><DataTable columns={columns} data={query.data?.data || []} rowKey={(r) => String(r.id)} loading={query.isLoading} /></PageContainer></AppShell>
}
