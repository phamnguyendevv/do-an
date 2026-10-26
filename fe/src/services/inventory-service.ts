import { inventoryApi } from "@/lib/inventory-api";
import type { ExportReceipt, ImportReceipt } from "@/types";
import { applyStockDeltas, store } from "./store";

export interface StockLine {
  bookId: string;
  quantity: number;
  price: number;
}

export interface Result<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

const mergeLines = (lines: StockLine[], sign: 1 | -1) =>
  lines.reduce<Record<string, number>>((acc, l) => {
    acc[l.bookId] = (acc[l.bookId] ?? 0) + sign * (l.quantity || 0);
    return acc;
  }, {});

export function validateLines(lines: StockLine[], requirePrice: boolean): string | null {
  if (lines.length === 0) return "Vui lòng thêm ít nhất một sản phẩm.";
  if (lines.some((l) => !l.bookId)) return "Vui lòng chọn sách cho tất cả các dòng.";
  const bookIds = lines.map((l) => l.bookId);
  if (new Set(bookIds).size !== bookIds.length)
    return "Không được chọn trùng lặp sản phẩm trong cùng một phiếu.";
  if (lines.some((l) => !l.quantity || l.quantity < 1)) return "Số lượng phải lớn hơn 0.";
  if (requirePrice && lines.some((l) => l.price < 0)) return "Giá không hợp lệ.";
  return null;
}

/** Ensure requested quantity <= available stock for every line */
export function checkAvailability(lines: StockLine[]): string | null {
  const books = store.getSnapshot().books;
  const needed = mergeLines(lines, 1);
  for (const [bookId, qty] of Object.entries(needed)) {
    const book = books.find((b) => b.id === bookId);
    if (!book) continue;
    if (qty > book.stock) {
      return `Không đủ số lượng tồn kho: "${book.title}" chỉ còn ${book.stock} cuốn (yêu cầu ${qty}).`;
    }
  }
  return null;
}

export const inventoryService = {
  async createImport(input: {
    supplier: string;
    supplierId?: number;
    date: string;
    note?: string;
    lines: StockLine[];
  }): Promise<Result<ImportReceipt>> {
    if (!input.supplier) return { ok: false, error: "Vui lòng chọn nhà cung cấp." };
    const invalid = validateLines(input.lines, true);
    if (invalid) return { ok: false, error: invalid };

    try {
      // Call backend API
      const res = await inventoryApi.createImport({
        supplierName: input.supplier,
        ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
        importDate: input.date,
        ...(input.note !== undefined ? { note: input.note } : {}),
        lines: input.lines.map((l) => ({
          bookId: parseInt(l.bookId, 10) || l.bookId,
          quantity: l.quantity,
          price: l.price,
        })),
      });

      const receipt: ImportReceipt = {
        id: res.receiptCode || `IMP-${res.id}`,
        supplier: res.supplierName,
        date: res.importDate,
        totalItems: res.totalItems,
        totalValue: Number(res.totalValue),
        note: res.note,
      };

      // Sync local state
      const { imports } = store.getSnapshot();
      store.setState({ imports: [receipt, ...imports] });
      applyStockDeltas(mergeLines(input.lines, 1));

      return { ok: true, data: receipt };
    } catch (apiError) {
      return {
        ok: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Không thể lưu phiếu nhập vào máy chủ. Tồn kho chưa được thay đổi.",
      };
    }
  },

  async createExport(input: {
    orderId?: string;
    reason: string;
    note?: string;
    lines: StockLine[];
  }): Promise<Result<ExportReceipt>> {
    const invalid = validateLines(input.lines, false);
    if (invalid) return { ok: false, error: invalid };
    const shortage = checkAvailability(input.lines);
    if (shortage) return { ok: false, error: shortage };

    try {
      // Call backend API
      const res = await inventoryApi.createExport({
        ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
        reason: input.reason,
        ...(input.note !== undefined ? { note: input.note } : {}),
        lines: input.lines.map((l) => ({
          bookId: parseInt(l.bookId, 10) || l.bookId,
          quantity: l.quantity,
          price: l.price,
        })),
      });

      const receipt: ExportReceipt = {
        id: res.receiptCode || `EXP-${res.id}`,
        orderId: res.orderId ?? "",
        date: res.exportDate,
        totalItems: res.totalItems,
        reason: res.reason,
        note: res.note,
      };

      // Sync local state
      const { exports } = store.getSnapshot();
      store.setState({ exports: [receipt, ...exports] });
      applyStockDeltas(mergeLines(input.lines, -1));

      return { ok: true, data: receipt };
    } catch (apiError) {
      return {
        ok: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Không thể lưu phiếu xuất vào máy chủ. Tồn kho chưa được thay đổi.",
      };
    }
  },
};
