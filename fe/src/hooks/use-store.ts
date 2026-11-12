import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "@/lib/category-api";
import { customerApi } from "@/lib/customer-api";
import { inventoryApi } from "@/lib/inventory-api";
import { mapOrderApiItem, orderApi } from "@/lib/order-api";
import { fetchAllPages } from "@/lib/paginated-api";
import { useLiveBooks } from "@/hooks/use-live-books";
import { store, type AppState } from "@/services/store";
import type {
  ExportReceiptApiItem,
  ImportReceiptApiItem,
  StockAuditApiItem,
  StockMovementApiItem,
} from "@/lib/inventory-api";
import type {
  Book,
  Customer,
  ExportReceipt,
  ImportReceipt,
  Order,
  Shipping,
  StockMovement,
  Stocktake,
} from "@/types";

function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useBooks(): Book[] {
  const query = useBooksQuery();
  return query.data ?? [];
}

export function useBooksQuery() {
  return useLiveBooks();
}

export function useCategories(): Array<{ id: string; name: string }> {
  const query = useQuery({
    queryKey: ["categories", "lookup"],
    queryFn: async () => {
      const firstPage = await categoryApi.list({ page: 1, size: 100 });
      const pageCount = Math.ceil(
        firstPage.pagination.total / Math.max(1, firstPage.pagination.size),
      );
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          categoryApi.list({ page: index + 2, size: firstPage.pagination.size || 100 }),
        ),
      );
      return [firstPage, ...rest].flatMap((response) =>
        response.data.map(({ id, name }) => ({ id: String(id), name })),
      );
    },
  });
  return query.data ?? [];
}

export function useOrders(): Order[] {
  const query = useOrdersQuery();
  return query.data ?? [];
}

export function useOrdersQuery() {
  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: async () =>
      (await fetchAllPages((page, size) => orderApi.list({ page, size }))).map(mapOrderApiItem),
    refetchInterval: 30_000,
  });
}

export function useCustomers(): Customer[] {
  const query = useQuery({
    queryKey: ["customers", "all"],
    queryFn: async () => {
      const customers = await fetchAllPages((page, size) => customerApi.list({ page, size }));
      return customers.map((customer) => ({
        ...customer,
        id: String(customer.id),
      }));
    },
  });
  return query.data ?? [];
}

export function useImportReceipts(): ImportReceipt[] {
  const query = useImportReceiptsQuery();
  return query.data ?? [];
}

export function useImportReceiptsQuery() {
  return useQuery({
    queryKey: ["inventory", "imports", "all"],
    queryFn: async () =>
      (await fetchAllPages((page, size) => inventoryApi.listImports({ page, size }))).map(
        mapImportReceipt,
      ),
  });
}

export function useExportReceipts(): ExportReceipt[] {
  const query = useExportReceiptsQuery();
  return query.data ?? [];
}

export function useExportReceiptsQuery() {
  return useQuery({
    queryKey: ["inventory", "exports", "all"],
    queryFn: async () =>
      (await fetchAllPages((page, size) => inventoryApi.listExports({ page, size }))).map(
        mapExportReceipt,
      ),
  });
}

export function useShipments(): Shipping[] {
  const orders = useOrders();
  return orders
    .filter((order) => Boolean(order.trackingCode))
    .map((order) => ({
      id: order.id,
      orderId: order.orderCode ?? order.id,
      customerName: order.customerName,
      carrier: order.shippingMethod || "Giao hàng",
      trackingNumber: order.trackingCode ?? "",
      shippingFee: order.shippingFee,
      expectedDelivery: "",
      status: shippingStatusFromOrder(order.status),
      address: order.customerAddress,
    }));
}

export function useStockMovements(): StockMovement[] {
  const query = useQuery({
    queryKey: ["inventory", "movements", "all"],
    queryFn: async () =>
      (await fetchAllPages((page, size) => inventoryApi.listMovements({ page, size }))).map(
        mapStockMovement,
      ),
  });
  return query.data ?? [];
}

export function useNotifications() {
  return useAppState().notifications;
}

export function useUnreadNotificationCount() {
  return useAppState().notificationsUnreadCount;
}

export function useInventorySummary() {
  const query = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => inventoryApi.getSummary(),
    refetchInterval: 30_000,
  });
  return {
    totalStock: query.data?.totalStock ?? 0,
    lowStock: query.data?.lowStockCount ?? 0,
    outOfStock: query.data?.outOfStockCount ?? 0,
    inventoryValue: query.data?.inventoryValue ?? 0,
  };
}

function mapImportReceipt(item: ImportReceiptApiItem): ImportReceipt {
  return {
    id: item.receiptCode || String(item.id),
    supplier: item.supplierName,
    ...(item.supplierId !== undefined ? { supplierId: String(item.supplierId) } : {}),
    date: item.importDate,
    totalItems: Number(item.totalItems),
    totalValue: Number(item.totalValue),
    items: (item.items ?? []).map((line) => ({
      bookId: String(line.bookId),
      title: line.title,
      quantity: Number(line.quantity),
      price: Number(line.price),
    })),
    ...(item.note ? { note: item.note } : {}),
  };
}

function mapExportReceipt(item: ExportReceiptApiItem): ExportReceipt {
  return {
    id: item.receiptCode || String(item.id),
    orderId: item.orderId === undefined ? "" : String(item.orderId),
    date: item.exportDate,
    totalItems: Number(item.totalItems),
    items: (item.items ?? []).map((line) => ({
      bookId: String(line.bookId),
      title: line.title,
      quantity: Number(line.quantity),
      price: Number(line.price ?? 0),
    })),
    reason: item.reason,
    ...(item.note ? { note: item.note } : {}),
  };
}

function mapStockMovement(item: StockMovementApiItem): StockMovement {
  return {
    id: String(item.id),
    bookId: String(item.bookId),
    bookTitle: item.bookTitle,
    type: item.type,
    quantity: Number(item.quantity),
    beforeStock: Number(item.beforeStock),
    afterStock: Number(item.afterStock),
    ...(item.referenceCode ? { referenceCode: item.referenceCode } : {}),
    ...(item.note ? { note: item.note } : {}),
    ...(item.createdBy ? { createdBy: item.createdBy } : {}),
    createdAt: item.createdAt,
  };
}

export function mapStockAudit(item: StockAuditApiItem): Stocktake {
  return {
    id: String(item.id),
    title: item.title,
    auditDate: item.auditDate,
    status: item.status,
    items: item.items.map((line) => ({
      ...line,
      bookId: String(line.bookId),
      systemStock: Number(line.systemStock),
      actualStock: Number(line.actualStock),
      diffQuantity: Number(line.diffQuantity),
    })),
    totalSystemStock: Number(item.totalSystemStock),
    totalActualStock: Number(item.totalActualStock),
    totalDiff: Number(item.totalDiff),
    ...(item.note ? { note: item.note } : {}),
    auditedBy: item.auditedBy,
    ...(item.balancedAt ? { balancedAt: item.balancedAt } : {}),
    createdAt: item.createdAt,
  };
}

function shippingStatusFromOrder(status: Order["status"]): Shipping["status"] {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
    case "PREPARING":
      return "WAITING_PICKUP";
    case "SHIPPING":
      return "IN_TRANSIT";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
      return "FAILED";
    case "RETURNED":
      return "RETURNED";
    case "CANCELLED":
      return "CANCELLED";
  }
}
