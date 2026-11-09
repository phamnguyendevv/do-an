import type { Book, StockMovement, Stocktake, StocktakeItem } from "@/types";
import { store, nextId, bookStatusOf } from "./store";
import { serviceFailure, serviceSuccess, type ServiceResult } from "./service-result";

type StocktakeInput = {
  title: string;
  note?: string;
  auditedBy: string;
  items: Array<{ bookId: string; actualStock: number; reason?: string }>;
};

const failure = <T>(
  code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "PERSISTENCE_ERROR",
  error: string,
) => serviceFailure<T>(code, error);

function persistError<T>(error: unknown): ServiceResult<T> {
  return failure(
    "PERSISTENCE_ERROR",
    error instanceof Error ? error.message : "Không thể lưu phiếu kiểm kê.",
  );
}

export const stocktakeService = {
  list(): ServiceResult<Stocktake[]> {
    return serviceSuccess(store.getSnapshot().stocktakes);
  },

  get(id: string): ServiceResult<Stocktake> {
    const stocktake = store.getSnapshot().stocktakes.find((item) => item.id === id);
    return stocktake
      ? serviceSuccess(stocktake)
      : failure("NOT_FOUND", "Không tìm thấy phiếu kiểm kê.");
  },

  create(input: StocktakeInput): ServiceResult<Stocktake> {
    if (!input.title?.trim() || !input.auditedBy?.trim()) {
      return failure("VALIDATION_ERROR", "Tiêu đề và người thực hiện kiểm kê là bắt buộc.");
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return failure("VALIDATION_ERROR", "Phiếu kiểm kê phải có ít nhất một đầu sách.");
    }
    if (
      input.items.some(
        (item) =>
          !item.bookId?.trim() || !Number.isSafeInteger(item.actualStock) || item.actualStock < 0,
      )
    ) {
      return failure("VALIDATION_ERROR", "Tồn thực tế phải là số nguyên không âm.");
    }
    const bookIds = input.items.map((item) => item.bookId);
    if (new Set(bookIds).size !== bookIds.length) {
      return failure("VALIDATION_ERROR", "Không được lặp sách trong một phiếu kiểm kê.");
    }

    const state = store.getSnapshot();
    if (
      bookIds.length !== state.books.length ||
      state.books.some((book) => !bookIds.includes(book.id))
    ) {
      return failure("CONFLICT", "Phiếu kiểm kê phải bao gồm toàn bộ sách hiện có trong kho.");
    }
    const items: StocktakeItem[] = input.items.map((item) => {
      const book = state.books.find((candidate) => candidate.id === item.bookId)!;
      return {
        bookId: book.id,
        title: book.title,
        systemStock: book.stock,
        actualStock: item.actualStock,
        diffQuantity: item.actualStock - book.stock,
        ...(item.reason?.trim() ? { reason: item.reason.trim() } : {}),
      };
    });
    const totalSystemStock = items.reduce((sum, item) => sum + item.systemStock, 0);
    const totalActualStock = items.reduce((sum, item) => sum + item.actualStock, 0);
    const totalDiff = totalActualStock - totalSystemStock;
    if (
      !Number.isSafeInteger(totalSystemStock) ||
      !Number.isSafeInteger(totalActualStock) ||
      !Number.isSafeInteger(totalDiff)
    ) {
      return failure("VALIDATION_ERROR", "Tổng tồn kho vượt giới hạn cho phép.");
    }
    const auditDate = new Date().toISOString();
    const stocktake: Stocktake = {
      id: nextId("AUD", state.stocktakes),
      title: input.title.trim(),
      auditDate,
      status: "DRAFT",
      items,
      totalSystemStock,
      totalActualStock,
      totalDiff,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      auditedBy: input.auditedBy.trim(),
      createdAt: auditDate,
    };
    try {
      store.setState({ stocktakes: [stocktake, ...state.stocktakes] });
      return serviceSuccess(stocktake);
    } catch (error) {
      return persistError(error);
    }
  },

  balance(id: string): ServiceResult<Stocktake> {
    const state = store.getSnapshot();
    const stocktake = state.stocktakes.find((item) => item.id === id);
    if (!stocktake) return failure("NOT_FOUND", "Không tìm thấy phiếu kiểm kê.");
    if (stocktake.status === "BALANCED") return serviceSuccess(stocktake);

    const booksById = new Map(state.books.map((book) => [book.id, book]));
    const updatedBooks: Book[] = [...state.books];
    const movements: StockMovement[] = [...state.movements];
    const balancedAt = new Date().toISOString();
    for (const item of stocktake.items) {
      const book = booksById.get(item.bookId);
      if (!book) {
        return failure("CONFLICT", `Không tìm thấy sách "${item.title}" để cân bằng kho.`);
      }
      const delta = item.actualStock - book.stock;
      if (!Number.isSafeInteger(delta)) {
        return failure("VALIDATION_ERROR", `Chênh lệch tồn "${item.title}" vượt giới hạn.`);
      }
      if (delta === 0) continue;
      const updatedBook: Book = {
        ...book,
        stock: item.actualStock,
        status:
          book.status === "DISCONTINUED"
            ? "DISCONTINUED"
            : bookStatusOf(item.actualStock, book.minStock),
      };
      const bookIndex = updatedBooks.findIndex((candidate) => candidate.id === book.id);
      updatedBooks[bookIndex] = updatedBook;
      movements.unshift({
        id: nextId("MOV", movements),
        bookId: book.id,
        bookTitle: item.title,
        type: "ADJUST",
        quantity: Math.abs(delta),
        beforeStock: book.stock,
        afterStock: item.actualStock,
        referenceCode: stocktake.id,
        note: `Cân bằng theo phiếu kiểm kê "${stocktake.title}"`,
        createdBy: stocktake.auditedBy ?? "DEMO",
        createdAt: balancedAt,
      });
    }
    const balanced: Stocktake = { ...stocktake, status: "BALANCED", balancedAt };
    try {
      store.setState({
        books: updatedBooks,
        movements,
        stocktakes: state.stocktakes.map((item) => (item.id === id ? balanced : item)),
      });
      return serviceSuccess(balanced);
    } catch (error) {
      return persistError(error);
    }
  },
};
