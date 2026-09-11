export type ImportReceiptApiItem = {
  id: number;
  receiptCode: string;
  supplierId?: number;
  supplierName: string;
  importDate: string;
  totalItems: number;
  totalValue: number;
  note?: string;
  items: Array<{ bookId: number | string; title: string; quantity: number; price: number }>;
  createdBy?: string;
  createdAt: string;
};

export type ExportReceiptApiItem = {
  id: number;
  receiptCode: string;
  orderId?: string;
  reason: string;
  exportDate: string;
  totalItems: number;
  note?: string;
  items: Array<{ bookId: number | string; title: string; quantity: number; price?: number }>;
  createdBy?: string;
  createdAt: string;
};

export type StockMovementApiItem = {
  id: number;
  bookId: number;
  bookTitle: string;
  type: "IMPORT" | "EXPORT" | "SALE" | "RESTOCK" | "ADJUST";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  referenceCode?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
};

export type StockAuditItemApi = {
  bookId: number;
  title: string;
  systemStock: number;
  actualStock: number;
  diffQuantity: number;
  reason?: string;
};

export type StockAuditApiItem = {
  id: number;
  auditCode: string;
  title: string;
  auditDate: string;
  status: "DRAFT" | "BALANCED";
  items: StockAuditItemApi[];
  totalSystemStock: number;
  totalActualStock: number;
  totalDiff: number;
  note?: string;
  auditedBy: string;
  balancedAt?: string;
  createdAt: string;
};

export type InventorySummaryApiResponse = {
  totalTitles: number;
  totalStock: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  stats: {
    totalImportQty: number;
    totalExportQty: number;
    totalSaleQty: number;
    totalRestockQty: number;
  };
};

import { apiRequest } from "./api-client";

export const inventoryApi = {
  async getSummary() {
    return apiRequest<InventorySummaryApiResponse>(`/admin/inventory/summary`);
  },

  async listImports(params?: {
    supplierId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.supplierId) search.set("supplierId", String(params.supplierId));
    if (params?.search) search.set("search", params.search);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<{
      data: ImportReceiptApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/inventory/import${qs ? `?${qs}` : ""}`);
  },

  async getImportDetail(id: number | string) {
    return apiRequest<ImportReceiptApiItem>(`/admin/inventory/import/${id}`);
  },

  async createImport(payload: {
    supplierId?: number;
    supplierName: string;
    importDate?: string;
    note?: string;
    lines: Array<{ bookId: number | string; quantity: number; price: number }>;
  }) {
    return apiRequest<ImportReceiptApiItem>(`/admin/inventory/import`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listExports(params?: {
    orderId?: string;
    reason?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.orderId) search.set("orderId", params.orderId);
    if (params?.reason) search.set("reason", params.reason);
    if (params?.search) search.set("search", params.search);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<{
      data: ExportReceiptApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/inventory/export${qs ? `?${qs}` : ""}`);
  },

  async getExportDetail(id: number | string) {
    return apiRequest<ExportReceiptApiItem>(`/admin/inventory/export/${id}`);
  },

  async createExport(payload: {
    orderId?: string;
    reason: string;
    note?: string;
    lines: Array<{ bookId: number | string; quantity: number; price?: number }>;
  }) {
    return apiRequest<ExportReceiptApiItem>(`/admin/inventory/export`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listMovements(params?: {
    bookId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.bookId) search.set("bookId", String(params.bookId));
    if (params?.type) search.set("type", params.type);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<{
      data: StockMovementApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/inventory/movements${qs ? `?${qs}` : ""}`);
  },

  async listAudits(params?: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.search) search.set("search", params.search);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<{
      data: StockAuditApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/inventory/audit${qs ? `?${qs}` : ""}`);
  },

  async getAudit(id: number | string) {
    return apiRequest<StockAuditApiItem>(`/admin/inventory/audit/${id}`);
  },

  async createAudit(payload: {
    title: string;
    note?: string;
    items: Array<{ bookId: number; actualStock: number; reason?: string }>;
  }) {
    return apiRequest<StockAuditApiItem>(`/admin/inventory/audit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async balanceAudit(id: number | string) {
    return apiRequest<StockAuditApiItem>(`/admin/inventory/audit/${id}/balance`, {
      method: "POST",
    });
  },
};
