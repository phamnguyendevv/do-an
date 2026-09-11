import React, { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { store, type AppState } from "@/services/store";
import { bookApi, type BookApiItem } from "@/lib/book-api";
import { categoryApi } from "@/lib/category-api";
import { orderApi, type OrderApiItem } from "@/lib/order-api";
import {
  inventoryApi,
  type ImportReceiptApiItem,
  type ExportReceiptApiItem,
} from "@/lib/inventory-api";
import type {
  Book,
  ExportReceipt,
  ImportReceipt,
  Order,
  OrderStatus,
  PaymentStatus,
} from "@/types";

const mapApiBook = (book: BookApiItem): Book => {
  const stock = Number(book?.stock ?? 0);
  const minStock = Number(book?.minStock ?? 0);
  const rawStatus =
    (book?.status as any) ||
    (stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK");

  return {
    id: String(book?.id ?? ""),
    title: String(book?.title ?? ""),
    author: String(book?.author ?? ""),
    category: String(book?.category ?? ""),
    purchasePrice: Number(book?.purchasePrice ?? 0),
    sellingPrice: Number(book?.sellingPrice ?? 0),
    stock,
    minStock,
    status: rawStatus,
    createdAt:
      typeof book?.createdAt === "string"
        ? book.createdAt
        : new Date(book?.createdAt ?? Date.now()).toISOString(),
  };
};

const mapApiOrder = (o: OrderApiItem): Order => {
  return {
    id: String(o.id),
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    provinceId: o.provinceId,
    districtId: o.districtId,
    wardCode: o.wardCode,
    items: (o.items || []).map((it) => ({
      bookId: String(it.bookId),
      title: it.title,
      quantity: it.quantity,
      price: Number(it.price),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shippingFee: Number(o.shippingFee),
    total: Number(o.total),
    payment: o.payment as PaymentStatus,
    shippingMethod: o.shippingMethod,
    trackingCode: o.trackingCode,
    note: o.note,
    status: o.status as OrderStatus,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : new Date(o.createdAt ?? Date.now()).toISOString(),
  };
};

const mapApiImport = (r: ImportReceiptApiItem): ImportReceipt => ({
  id: r.receiptCode || `IMP-${r.id}`,
  supplier: r.supplierName,
  date: typeof r.importDate === "string" ? r.importDate : new Date(r.importDate).toISOString(),
  totalItems: Number(r.totalItems),
  totalValue: Number(r.totalValue),
  note: r.note,
});

const mapApiExport = (r: ExportReceiptApiItem): ExportReceipt => ({
  id: r.receiptCode || `EXP-${r.id}`,
  orderId: r.orderId || "",
  date: typeof r.exportDate === "string" ? r.exportDate : new Date(r.exportDate).toISOString(),
  totalItems: Number(r.totalItems),
  reason: r.reason,
  note: r.note,
});

function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useBooks(): Book[] {
  const stateBooks = useAppState().books;

  const { data: apiBooks } = useQuery({
    queryKey: ["books", "live-list"],
    queryFn: async () => {
      try {
        const res = await bookApi.list({ size: 500 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return (items as BookApiItem[]).map(mapApiBook);
      } catch {
        return [];
      }
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (apiBooks && apiBooks.length > 0) {
      store.setState({ books: apiBooks });
    }
  }, [apiBooks]);

  if (apiBooks && apiBooks.length > 0) {
    return apiBooks;
  }

  return stateBooks;
}

export function useCategories(): Array<{ id: string; name: string }> {
  const books = useBooks();
  const { data: apiCategories } = useQuery({
    queryKey: ["category-names"],
    queryFn: async () => {
      try {
        const res: any = await categoryApi.list({ size: 100 });
        let items: any[] = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (Array.isArray(res?.data)) {
          items = res.data;
        } else if (Array.isArray(res?.data?.data)) {
          items = res.data.data;
        }

        const mapped = items
          .map((c: any) => {
            if (typeof c === "string") return { id: c, name: c.trim() };
            const name = String(c?.name || c?.title || c?.categoryName || c?.category || "").trim();
            const id = String(c?.id || name || "");
            return { id, name };
          })
          .filter((c) => Boolean(c.name && c.name.length > 0));

        return mapped;
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  if (apiCategories && apiCategories.length > 0) {
    return apiCategories;
  }

  const uniqueNames = Array.from(
    new Set(
      books
        .map((b) => (typeof b?.category === "string" ? b.category.trim() : ""))
        .filter((cat) => Boolean(cat && cat.length > 0)),
    ),
  );

  return uniqueNames.map((name) => ({ id: name, name }));
}

export function useOrders(): Order[] {
  const stateOrders = useAppState().orders;

  const { data: apiOrders } = useQuery({
    queryKey: ["orders", "live-list"],
    queryFn: async () => {
      try {
        const res = await orderApi.list({ size: 500 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return (items as OrderApiItem[]).map(mapApiOrder);
      } catch {
        return [];
      }
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (apiOrders && apiOrders.length > 0) {
      store.setState({ orders: apiOrders });
    }
  }, [apiOrders]);

  if (apiOrders && apiOrders.length > 0) {
    return apiOrders;
  }

  return stateOrders;
}

export function useImportReceipts(): ImportReceipt[] {
  const stateImports = useAppState().imports;

  const { data: apiImports } = useQuery({
    queryKey: ["inventory", "imports-list"],
    queryFn: async () => {
      try {
        const res = await inventoryApi.listImports({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : [];
        return items.map(mapApiImport);
      } catch {
        return [];
      }
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (apiImports && apiImports.length > 0) {
      store.setState({ imports: apiImports });
    }
  }, [apiImports]);

  if (apiImports && apiImports.length > 0) {
    return apiImports;
  }

  return stateImports;
}

export function useExportReceipts(): ExportReceipt[] {
  const stateExports = useAppState().exports;

  const { data: apiExports } = useQuery({
    queryKey: ["inventory", "exports-list"],
    queryFn: async () => {
      try {
        const res = await inventoryApi.listExports({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : [];
        return items.map(mapApiExport);
      } catch {
        return [];
      }
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (apiExports && apiExports.length > 0) {
      store.setState({ exports: apiExports });
    }
  }, [apiExports]);

  if (apiExports && apiExports.length > 0) {
    return apiExports;
  }

  return stateExports;
}

export function useShipments(): import("@/types").Shipping[] {
  const stateShipments = useAppState().shipments;
  const orders = useAppState().orders;

  const mergedShipments = React.useMemo(() => {
    const existing = new Map(stateShipments.map((s) => [s.orderId, s]));
    const generated: import("@/types").Shipping[] = [];

    for (const order of orders) {
      if (!existing.has(order.id) && !existing.has(order.orderCode ?? "")) {
        generated.push({
          id: `SHP-auto-${order.id}`,
          orderId: order.id,
          customerName: order.customerName,
          carrier: order.shippingMethod || "Giao Hàng Nhanh (GHN)",
          trackingNumber: order.trackingCode || "",
          shippingFee: order.shippingFee || 0,
          expectedDelivery: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          status:
            order.status === "DELIVERED"
              ? "DELIVERED"
              : order.status === "CANCELLED"
                ? "RETURNED"
                : order.status === "SHIPPING"
                  ? "OUT_FOR_DELIVERY"
                  : order.status === "PREPARING"
                    ? "PICKED_UP"
                    : "WAITING_PICKUP",
          address: order.customerAddress,
        });
      }
    }

    if (generated.length === 0) return stateShipments;
    return [...generated, ...stateShipments];
  }, [stateShipments, orders]);

  return mergedShipments;
}

export function useInventorySummary() {
  const books = useBooks();
  return {
    totalStock: books.reduce((s, b) => s + (b.stock || 0), 0),
    lowStock: books.filter((b) => b.status === "LOW_STOCK").length,
    outOfStock: books.filter((b) => b.status === "OUT_OF_STOCK").length,
    inventoryValue: books.reduce((s, b) => s + (b.stock || 0) * (b.purchasePrice || 0), 0),
  };
}
