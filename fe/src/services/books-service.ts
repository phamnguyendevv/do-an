import type { Book, Category, Publisher, StockMovement } from "@/types";
import { store, nextId, bookStatusOf } from "./store";
import { serviceFailure, serviceSuccess, type ServiceResult } from "./service-result";

type NewBook = Omit<Book, "id" | "createdAt" | "status" | "stock"> & {
  stock?: number;
};
type BookUpdate = Partial<Omit<Book, "id" | "createdAt">>;

const validateBook = (book: Partial<Book>): string | null => {
  if (!book.title?.trim() || !book.author?.trim() || !book.category?.trim()) {
    return "Tên sách, tác giả và thể loại là bắt buộc.";
  }
  if (
    (book.stock !== undefined && (!Number.isSafeInteger(book.stock) || book.stock < 0)) ||
    !Number.isFinite(book.purchasePrice) ||
    (book.purchasePrice ?? -1) < 0 ||
    !Number.isFinite(book.sellingPrice) ||
    (book.sellingPrice ?? -1) < 0 ||
    !Number.isFinite(book.minStock) ||
    (book.minStock ?? -1) < 0
  ) {
    return "Giá và tồn tối thiểu phải là số không âm.";
  }
  return null;
};

function addCategoryAndPublisherReferences(
  name: string,
  publisherName: string | undefined,
  categories: Category[],
  publishers: Publisher[],
) {
  let nextCategories = categories;
  let nextPublishers = publishers;
  const foundCategory = categories.find(
    (category) => category.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
  const category =
    foundCategory ??
    ({
      id: nextId("CAT", categories),
      name: name.trim(),
    } satisfies Category);
  if (!foundCategory) nextCategories = [category, ...categories];

  let publisher: Publisher | undefined;
  if (publisherName?.trim()) {
    const foundPublisher = publishers.find(
      (item) => item.name.toLocaleLowerCase() === publisherName.trim().toLocaleLowerCase(),
    );
    publisher =
      foundPublisher ??
      ({
        id: nextId("PUB", publishers),
        name: publisherName.trim(),
      } satisfies Publisher);
    if (!foundPublisher) nextPublishers = [publisher, ...publishers];
  }
  return {
    categories: nextCategories,
    publishers: nextPublishers,
    categoryId: category.id,
    publisherId: publisher?.id,
  };
}

function createMovement(
  book: Book,
  movements: StockMovement[],
  quantity: number,
  referenceCode: string,
  createdAt: string,
): StockMovement {
  return {
    id: nextId("MOV", movements),
    bookId: book.id,
    bookTitle: book.title,
    type: "IMPORT",
    quantity,
    beforeStock: 0,
    afterStock: quantity,
    referenceCode,
    note: "Tồn đầu kỳ",
    createdBy: "DEMO",
    createdAt,
  };
}

const persistFailure = <T>(error: unknown): ServiceResult<T> =>
  serviceFailure(
    "PERSISTENCE_ERROR",
    error instanceof Error ? error.message : "Không thể lưu thay đổi sách.",
  );

export const booksService = {
  list(): ServiceResult<Book[]> {
    return serviceSuccess(store.getSnapshot().books);
  },

  get(id: string): ServiceResult<Book> {
    const book = store.getSnapshot().books.find((item) => item.id === id);
    return book ? serviceSuccess(book) : serviceFailure("NOT_FOUND", "Không tìm thấy sách.");
  },

  create(input: NewBook): ServiceResult<Book> {
    const invalid = validateBook(input);
    if (invalid) return serviceFailure("VALIDATION_ERROR", invalid);
    const current = store.getSnapshot();
    if (input.isbn && current.books.some((book) => book.isbn === input.isbn)) {
      return serviceFailure("CONFLICT", "ISBN đã được sử dụng.");
    }
    const references = addCategoryAndPublisherReferences(
      input.category,
      input.publisher,
      current.categories,
      current.publishers,
    );
    const stock = input.stock ?? 0;
    const createdAt = new Date().toISOString();
    const book: Book = {
      ...input,
      id: nextId("BOOK", current.books),
      stock,
      status: bookStatusOf(stock, input.minStock),
      createdAt,
      ...references,
    };
    const movements =
      stock > 0
        ? [
            createMovement(book, current.movements, stock, `OPENING-${book.id}`, createdAt),
            ...current.movements,
          ]
        : current.movements;
    try {
      store.setState({
        books: [book, ...current.books],
        categories: references.categories,
        publishers: references.publishers,
        movements,
      });
      return serviceSuccess(book);
    } catch (error) {
      return persistFailure(error);
    }
  },

  update(id: string, patch: BookUpdate): ServiceResult<Book> {
    const current = store.getSnapshot();
    const previous = current.books.find((book) => book.id === id);
    if (!previous) return serviceFailure("NOT_FOUND", "Không tìm thấy sách.");
    const invalid = validateBook({ ...previous, ...patch });
    if (invalid) return serviceFailure("VALIDATION_ERROR", invalid);
    if (patch.isbn && current.books.some((book) => book.id !== id && book.isbn === patch.isbn)) {
      return serviceFailure("CONFLICT", "ISBN đã được sử dụng.");
    }
    const references = addCategoryAndPublisherReferences(
      patch.category ?? previous.category,
      patch.publisher ?? previous.publisher,
      current.categories,
      current.publishers,
    );
    const updated: Book = {
      ...previous,
      ...patch,
      stock: patch.stock ?? previous.stock,
      status:
        patch.status === "DISCONTINUED" ||
        (patch.status === undefined && previous.status === "DISCONTINUED")
          ? "DISCONTINUED"
          : bookStatusOf(patch.stock ?? previous.stock, patch.minStock ?? previous.minStock),
      ...references,
    };
    const stockDelta = updated.stock - previous.stock;
    const movements =
      stockDelta === 0
        ? current.movements
        : [
            {
              id: nextId("MOV", current.movements),
              bookId: id,
              bookTitle: updated.title,
              type: stockDelta > 0 ? ("IMPORT" as const) : ("ADJUST" as const),
              quantity: Math.abs(stockDelta),
              beforeStock: previous.stock,
              afterStock: updated.stock,
              referenceCode: `ADJUST-${id}-${Date.now()}`,
              note: "Điều chỉnh tồn kho từ hồ sơ sách",
              createdBy: "DEMO",
              createdAt: new Date().toISOString(),
            },
            ...current.movements,
          ];
    try {
      store.setState({
        books: current.books.map((book) => (book.id === id ? updated : book)),
        categories: references.categories,
        publishers: references.publishers,
        movements,
      });
      return serviceSuccess(updated);
    } catch (error) {
      return persistFailure(error);
    }
  },

  delete(id: string): ServiceResult<void> {
    const current = store.getSnapshot();
    const book = current.books.find((item) => item.id === id);
    if (!book) return serviceFailure("NOT_FOUND", "Không tìm thấy sách.");
    const referenced =
      book.stock > 0 ||
      current.orders.some((order) => order.items.some((item) => item.bookId === id)) ||
      current.imports.some((receipt) => receipt.items?.some((item) => item.bookId === id)) ||
      current.exports.some((receipt) => receipt.items?.some((item) => item.bookId === id)) ||
      current.stocktakes.some((stocktake) => stocktake.items.some((item) => item.bookId === id)) ||
      current.movements.some((movement) => movement.bookId === id);
    if (referenced) {
      return serviceFailure(
        "CONFLICT",
        "Không thể xóa sách đang có tồn kho hoặc lịch sử giao dịch.",
      );
    }
    try {
      store.setState({ books: current.books.filter((item) => item.id !== id) });
      return serviceSuccess(undefined);
    } catch (error) {
      return persistFailure(error);
    }
  },

  createMany(inputs: NewBook[], idempotencyKey?: string): ServiceResult<Book[]> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return serviceFailure("VALIDATION_ERROR", "Không có sách hợp lệ để nhập.");
    }
    if (idempotencyKey && store.hasProcessedOperation(`books-import:${idempotencyKey}`)) {
      return serviceFailure("DUPLICATE_OPERATION", "Tệp nhập này đã được xử lý.");
    }
    const current = store.getSnapshot();
    const isbnSet = new Set(current.books.flatMap((book) => (book.isbn ? [book.isbn] : [])));
    for (const input of inputs) {
      const invalid = validateBook(input);
      if (invalid) return serviceFailure("VALIDATION_ERROR", invalid);
      if (input.isbn) {
        if (isbnSet.has(input.isbn)) {
          return serviceFailure("CONFLICT", `ISBN "${input.isbn}" đã tồn tại.`);
        }
        isbnSet.add(input.isbn);
      }
    }

    let categories = current.categories;
    let publishers = current.publishers;
    let books = current.books;
    let movements = current.movements;
    const createdAt = new Date().toISOString();
    const importedBooks = inputs.map((input) => {
      const references = addCategoryAndPublisherReferences(
        input.category,
        input.publisher,
        categories,
        publishers,
      );
      categories = references.categories;
      publishers = references.publishers;
      const book: Book = {
        ...input,
        stock: input.stock ?? 0,
        id: nextId("BOOK", books),
        status: bookStatusOf(input.stock ?? 0, input.minStock),
        createdAt,
        ...references,
      };
      books = [book, ...books];
      if (book.stock > 0) {
        movements = [
          createMovement(book, movements, book.stock, `EXCEL-${book.id}`, createdAt),
          ...movements,
        ];
      }
      return book;
    });

    const receiptItems = importedBooks
      .filter((book) => book.stock > 0)
      .map((book) => ({
        bookId: book.id,
        title: book.title,
        quantity: book.stock,
        price: book.purchasePrice,
      }));
    const totalItems = receiptItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = receiptItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    if (!Number.isFinite(totalValue)) {
      return serviceFailure("VALIDATION_ERROR", "Tổng giá trị nhập vượt giới hạn cho phép.");
    }
    const imports = [...current.imports];
    if (receiptItems.length > 0) {
      imports.unshift({
        id: nextId("IMP", imports, 1000),
        supplier: "Nhập danh mục Excel",
        date: createdAt,
        totalItems,
        totalValue,
        items: receiptItems,
        note: "Phiếu nhập tồn đầu kỳ từ Excel",
      });
    }
    try {
      store.setState({
        books,
        categories,
        publishers,
        movements,
        imports,
        ...(idempotencyKey
          ? {
              processedOperationKeys: [
                ...current.processedOperationKeys,
                `books-import:${idempotencyKey}`,
              ],
            }
          : {}),
      });
      return serviceSuccess(importedBooks);
    } catch (error) {
      return persistFailure(error);
    }
  },
};
