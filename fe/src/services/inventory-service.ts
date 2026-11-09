import type { Book, ExportReceipt, ImportReceipt, StockMovement } from "@/types";
import { bookStatusOf, nextId, store } from "./store";
import { serviceFailure, serviceSuccess, type ServiceResult } from "./service-result";

export interface StockLine {
  bookId: string;
  quantity: number;
  price: number;
}

export type Result<T> = ServiceResult<T>;

const mergeLines = (lines: StockLine[]) =>
  lines.reduce<Record<string, number>>((acc, line) => {
    acc[line.bookId] = (acc[line.bookId] ?? 0) + line.quantity;
    return acc;
  }, {});

export function validateLines(lines: StockLine[], requirePrice: boolean): string | null {
  if (!Array.isArray(lines) || lines.length === 0) return "Vui lòng thêm ít nhất một sản phẩm.";
  if (lines.some((line) => !line.bookId?.trim())) return "Vui lòng chọn sách cho tất cả các dòng.";
  const bookIds = lines.map((line) => line.bookId);
  if (new Set(bookIds).size !== bookIds.length)
    return "Không được chọn trùng lặp sản phẩm trong cùng một phiếu.";
  if (lines.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1)) {
    return "Số lượng phải là số nguyên lớn hơn 0.";
  }
  if (requirePrice && lines.some((line) => !Number.isFinite(line.price) || line.price < 0)) {
    return "Giá không hợp lệ.";
  }
  return null;
}

export function checkAvailability(lines: StockLine[]): string | null {
  const books = store.getSnapshot().books;
  const needed = mergeLines(lines);
  for (const [bookId, quantity] of Object.entries(needed)) {
    const book = books.find((item) => item.id === bookId);
    if (!book) return `Không tìm thấy sách có mã ${bookId}.`;
    if (quantity > book.stock) {
      return `Không đủ số lượng tồn kho: "${book.title}" chỉ còn ${book.stock} cuốn (yêu cầu ${quantity}).`;
    }
  }
  return null;
}

function applyLines(
  lines: StockLine[],
  sign: 1 | -1,
  date: string,
  referenceCode: string,
): { books: ReturnType<typeof store.getSnapshot>["books"]; movements: StockMovement[] } {
  const deltas = mergeLines(lines);
  const books: Book[] = store.getSnapshot().books.map((book) => {
    const quantity = deltas[book.id] ?? 0;
    if (!quantity) return book;
    const stock = book.stock + sign * quantity;
    const status: Book["status"] =
      book.status === "DISCONTINUED" ? "DISCONTINUED" : bookStatusOf(stock, book.minStock);
    return {
      ...book,
      stock,
      status,
    };
  });
  let movements = store.getSnapshot().movements;
  const newMovements = lines.map((line) => {
    const book = store.getSnapshot().books.find((item) => item.id === line.bookId)!;
    const beforeStock = book.stock;
    const afterStock = beforeStock + sign * line.quantity;
    const movement: StockMovement = {
      id: nextId("MOV", movements),
      bookId: book.id,
      bookTitle: book.title,
      type: sign > 0 ? "IMPORT" : "EXPORT",
      quantity: line.quantity,
      beforeStock,
      afterStock,
      referenceCode,
      createdBy: "DEMO",
      createdAt: date,
    };
    movements = [...movements, movement];
    return movement;
  });
  return { books, movements: [...store.getSnapshot().movements, ...newMovements] };
}

function invalid<T>(message: string) {
  return serviceFailure<T>("VALIDATION_ERROR", message);
}

function duplicate<T>(key?: string) {
  return key && store.hasProcessedOperation(`inventory:${key}`)
    ? serviceFailure<T>("DUPLICATE_OPERATION", "Thao tác này đã được xử lý.")
    : null;
}

export const inventoryService = {
  listImports(): Result<ImportReceipt[]> {
    return serviceSuccess(store.getSnapshot().imports);
  },

  listExports(): Result<ExportReceipt[]> {
    return serviceSuccess(store.getSnapshot().exports);
  },

  listMovements(): Result<StockMovement[]> {
    return serviceSuccess(store.getSnapshot().movements);
  },

  getImport(id: string): Result<ImportReceipt> {
    const receipt = store.getSnapshot().imports.find((item) => item.id === id);
    return receipt
      ? serviceSuccess(receipt)
      : serviceFailure("NOT_FOUND", "Không tìm thấy phiếu nhập.");
  },

  getExport(id: string): Result<ExportReceipt> {
    const receipt = store.getSnapshot().exports.find((item) => item.id === id);
    return receipt
      ? serviceSuccess(receipt)
      : serviceFailure("NOT_FOUND", "Không tìm thấy phiếu xuất.");
  },

  async createImport(input: {
    supplier: string;
    supplierId?: string;
    date: string;
    note?: string;
    lines: StockLine[];
    idempotencyKey?: string;
  }): Promise<Result<ImportReceipt>> {
    if (!input.supplier?.trim()) return invalid("Vui lòng chọn nhà cung cấp.");
    if (!Number.isFinite(Date.parse(input.date))) return invalid("Ngày nhập không hợp lệ.");
    const validationError = validateLines(input.lines, true);
    if (validationError) return invalid(validationError);
    const duplicateResult = duplicate<ImportReceipt>(input.idempotencyKey);
    if (duplicateResult) return duplicateResult;
    const availability = checkAvailability(input.lines.map((line) => ({ ...line, quantity: 0 })));
    if (availability) return serviceFailure("NOT_FOUND", availability);

    const state = store.getSnapshot();
    const { books, imports, movements, processedOperationKeys } = state;
    if (input.supplierId && !state.suppliers.some((item) => item.id === input.supplierId)) {
      return serviceFailure("NOT_FOUND", "Không tìm thấy nhà cung cấp liên kết.");
    }
    if (
      input.lines.some((line) => {
        const book = books.find((item) => item.id === line.bookId);
        return !book || !Number.isSafeInteger(book.stock + line.quantity);
      })
    ) {
      return invalid("Tổng tồn kho vượt giới hạn cho phép.");
    }
    const id = nextId("IMP", imports, 1000);
    const date = new Date(input.date).toISOString();
    const items = input.lines.map((line) => ({
      bookId: line.bookId,
      title: books.find((book) => book.id === line.bookId)!.title,
      quantity: line.quantity,
      price: line.price,
    }));
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const totalValue = items.reduce((total, item) => total + item.quantity * item.price, 0);
    if (!Number.isSafeInteger(totalItems) || !Number.isFinite(totalValue)) {
      return invalid("Tổng số lượng hoặc giá trị phiếu nhập vượt giới hạn cho phép.");
    }
    const receipt: ImportReceipt = {
      id,
      supplier: input.supplier.trim(),
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
      date,
      totalItems,
      totalValue,
      items,
      ...(input.note !== undefined ? { note: input.note } : {}),
    };
    const changed = applyLines(input.lines, 1, date, id);
    try {
      store.setState({
        books: changed.books,
        imports: [receipt, ...imports],
        movements: [...movements, ...changed.movements.slice(movements.length)],
        ...(input.idempotencyKey
          ? {
              processedOperationKeys: [
                ...processedOperationKeys,
                `inventory:${input.idempotencyKey}`,
              ],
            }
          : {}),
      });
      return serviceSuccess(receipt);
    } catch (error) {
      return serviceFailure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu phiếu nhập.",
      );
    }
  },

  async createExport(input: {
    orderId?: string;
    reason: string;
    note?: string;
    lines: StockLine[];
    idempotencyKey?: string;
  }): Promise<Result<ExportReceipt>> {
    if (!input.reason?.trim()) return invalid("Vui lòng nhập lý do xuất kho.");
    const validationError = validateLines(input.lines, true);
    if (validationError) return invalid(validationError);
    const duplicateResult = duplicate<ExportReceipt>(input.idempotencyKey);
    if (duplicateResult) return duplicateResult;
    const state = store.getSnapshot();
    const { books, exports, movements, orders, processedOperationKeys } = state;
    const linkedOrder = input.orderId
      ? orders.find((order) => order.id === input.orderId || order.orderCode === input.orderId)
      : undefined;
    if (input.orderId && !linkedOrder) {
      return serviceFailure("NOT_FOUND", "Không tìm thấy đơn hàng liên kết.");
    }
    if (
      linkedOrder &&
      (["CANCELLED", "RETURNED"].includes(linkedOrder.status) ||
        exports.some((receipt) => receipt.orderId === linkedOrder.id))
    ) {
      return serviceFailure("CONFLICT", "Đơn hàng đã hủy, hoàn trả hoặc đã có phiếu xuất.");
    }
    if (
      linkedOrder &&
      (linkedOrder.items.length !== input.lines.length ||
        linkedOrder.items.some((item) => {
          const line = input.lines.find((candidate) => candidate.bookId === item.bookId);
          return !line || line.quantity !== item.quantity;
        }))
    ) {
      return invalid("Số lượng xuất phải khớp với các sản phẩm của đơn hàng.");
    }
    if (!linkedOrder) {
      const availability = checkAvailability(input.lines);
      if (availability) {
        const code = availability.startsWith("Không đủ số lượng")
          ? "INSUFFICIENT_STOCK"
          : "NOT_FOUND";
        return serviceFailure(code, availability);
      }
    }
    const id = nextId("EXP", exports, 2000);
    const date = new Date().toISOString();
    const items = input.lines.map((line) => ({
      bookId: line.bookId,
      title: books.find((book) => book.id === line.bookId)!.title,
      quantity: line.quantity,
      price: line.price,
    }));
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    if (!Number.isSafeInteger(totalItems)) {
      return invalid("Tổng số lượng phiếu xuất vượt giới hạn cho phép.");
    }
    const receipt: ExportReceipt = {
      id,
      orderId: linkedOrder?.id ?? input.orderId ?? "",
      date,
      totalItems,
      items,
      reason: input.reason.trim(),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };
    const changed = linkedOrder ? { books, movements } : applyLines(input.lines, -1, date, id);
    try {
      store.setState({
        books: changed.books,
        exports: [receipt, ...exports],
        movements: linkedOrder
          ? movements
          : [...movements, ...changed.movements.slice(movements.length)],
        ...(input.idempotencyKey
          ? {
              processedOperationKeys: [
                ...processedOperationKeys,
                `inventory:${input.idempotencyKey}`,
              ],
            }
          : {}),
      });
      return serviceSuccess(receipt);
    } catch (error) {
      return serviceFailure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu phiếu xuất.",
      );
    }
  },
};
