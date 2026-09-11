import { apiRequest } from "./api-client";

export type ActivityLogApiItem = {
  id: number;
  actorName: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
};

export const activityLogApi = {
  list(params?: {
    search?: string;
    action?: string;
    resourceType?: string;
    page?: number;
    size?: number;
  }) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    const qs = query.toString();
    return apiRequest<{
      data: ActivityLogApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/activity-logs${qs ? `?${qs}` : ""}`);
  },
};
