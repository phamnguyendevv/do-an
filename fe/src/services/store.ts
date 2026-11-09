import type {
  Book,
  Category,
  Customer,
  ExportReceipt,
  ImportReceipt,
  Order,
  Publisher,
  Shipping,
  StockMovement,
  Stocktake,
  Supplier,
  User,
} from "@/types";
import { BOOK_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES, SHIPPING_STATUSES } from "@/types";
import { mockBooks, categories, publishers } from "@/mock/books";
import { mockOrders } from "@/mock/orders";
import {
  mockExportReceipts,
  mockImportReceipts,
  suppliers as mockSuppliers,
} from "@/mock/inventory";
import { mockShipments } from "@/mock/shipping";
import { mockUsers } from "@/mock/users";

export interface AppState {
  books: Book[];
  orders: Order[];
  imports: ImportReceipt[];
  exports: ExportReceipt[];
  shipments: Shipping[];
  categories: Category[];
  publishers: Publisher[];
  suppliers: Supplier[];
  customers: Customer[];
  users: User[];
  movements: StockMovement[];
  stocktakes: Stocktake[];
  processedOperationKeys: string[];
}

const STORAGE_KEY = "bookstock_app_state_v2";
export const STORAGE_VERSION = 4;

export class StorePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorePersistenceError";
  }
}

type StoreStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const unavailableStorage: StoreStorage = {
  getItem() {
    throw new StorePersistenceError("Không thể đọc localStorage của trình duyệt.");
  },
  setItem() {
    throw new StorePersistenceError("Không thể ghi localStorage của trình duyệt.");
  },
  removeItem() {
    throw new StorePersistenceError("Không thể xóa dữ liệu localStorage của trình duyệt.");
  },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasId = (value: unknown): value is Record<string, unknown> & { id: string } =>
  isRecord(value) && typeof value["id"] === "string" && value["id"].length > 0;
const validStatus = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

const isBook = (value: unknown): value is Book =>
  hasId(value) &&
  typeof value["title"] === "string" &&
  typeof value["author"] === "string" &&
  typeof value["category"] === "string" &&
  (value["description"] === undefined || typeof value["description"] === "string") &&
  typeof value["stock"] === "number" &&
  Number.isSafeInteger(value["stock"]) &&
  value["stock"] >= 0 &&
  typeof value["minStock"] === "number" &&
  Number.isSafeInteger(value["minStock"]) &&
  value["minStock"] >= 0 &&
  typeof value["purchasePrice"] === "number" &&
  Number.isFinite(value["purchasePrice"]) &&
  value["purchasePrice"] >= 0 &&
  typeof value["sellingPrice"] === "number" &&
  Number.isFinite(value["sellingPrice"]) &&
  value["sellingPrice"] >= 0 &&
  validStatus(value["status"], BOOK_STATUSES) &&
  typeof value["createdAt"] === "string";

const isOrder = (value: unknown): value is Order =>
  hasId(value) &&
  typeof value["customerName"] === "string" &&
  (value["customerId"] === undefined || typeof value["customerId"] === "string") &&
  typeof value["customerPhone"] === "string" &&
  typeof value["customerAddress"] === "string" &&
  Array.isArray(value["items"]) &&
  value["items"].every(
    (item) =>
      isRecord(item) &&
      typeof item["bookId"] === "string" &&
      typeof item["title"] === "string" &&
      typeof item["quantity"] === "number" &&
      Number.isSafeInteger(item["quantity"]) &&
      item["quantity"] > 0 &&
      typeof item["price"] === "number" &&
      Number.isFinite(item["price"]) &&
      item["price"] >= 0 &&
      (item["purchasePrice"] === undefined ||
        (typeof item["purchasePrice"] === "number" &&
          Number.isFinite(item["purchasePrice"]) &&
          item["purchasePrice"] >= 0)),
  ) &&
  ["subtotal", "discount", "shippingFee", "total"].every(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key] as number),
  ) &&
  validStatus(value["status"], ORDER_STATUSES) &&
  validStatus(value["payment"], PAYMENT_STATUSES) &&
  typeof value["createdAt"] === "string";

const isReceipt = (value: unknown): value is ImportReceipt | ExportReceipt => {
  if (
    !hasId(value) ||
    typeof value["date"] !== "string" ||
    !Number.isFinite(Date.parse(value["date"])) ||
    typeof value["totalItems"] !== "number" ||
    !Number.isSafeInteger(value["totalItems"]) ||
    value["totalItems"] < 0 ||
    (value["items"] !== undefined &&
      (!Array.isArray(value["items"]) ||
        !value["items"].every(
          (line) =>
            isRecord(line) &&
            typeof line["bookId"] === "string" &&
            typeof line["title"] === "string" &&
            Number.isSafeInteger(line["quantity"]) &&
            typeof line["quantity"] === "number" &&
            line["quantity"] > 0 &&
            typeof line["price"] === "number" &&
            Number.isFinite(line["price"]) &&
            line["price"] >= 0,
        )))
  ) {
    return false;
  }
  if ("supplier" in value) {
    return (
      typeof value["supplier"] === "string" &&
      value["supplier"].trim().length > 0 &&
      typeof value["totalValue"] === "number" &&
      Number.isFinite(value["totalValue"]) &&
      value["totalValue"] >= 0
    );
  }
  return (
    typeof value["reason"] === "string" &&
    value["reason"].trim().length > 0 &&
    typeof value["orderId"] === "string"
  );
};

const isShipping = (value: unknown): value is Shipping =>
  hasId(value) &&
  typeof value["orderId"] === "string" &&
  typeof value["customerName"] === "string" &&
  typeof value["carrier"] === "string" &&
  typeof value["trackingNumber"] === "string" &&
  typeof value["address"] === "string" &&
  typeof value["expectedDelivery"] === "string" &&
  Number.isFinite(Date.parse(value["expectedDelivery"])) &&
  typeof value["shippingFee"] === "number" &&
  Number.isFinite(value["shippingFee"]) &&
  value["shippingFee"] >= 0 &&
  validStatus(value["status"], SHIPPING_STATUSES);

const isNamedEntity = (
  value: unknown,
): value is Record<string, unknown> & { id: string; name: string } =>
  hasId(value) && typeof value["name"] === "string" && value["name"].trim().length > 0;
const isSupplier = (value: unknown): value is Supplier =>
  isNamedEntity(value) &&
  (value["phone"] === undefined || typeof value["phone"] === "string") &&
  (value["email"] === undefined || typeof value["email"] === "string");
const isCustomer = (value: unknown): value is Customer =>
  isNamedEntity(value) &&
  typeof value["phone"] === "string" &&
  value["phone"].trim().length > 0 &&
  (value["email"] === undefined || typeof value["email"] === "string");
const isUser = (value: unknown): value is User =>
  isNamedEntity(value) &&
  typeof value["email"] === "string" &&
  (value["role"] === "ADMIN" || value["role"] === "STAFF") &&
  typeof value["active"] === "boolean";
const isMovement = (value: unknown): value is StockMovement =>
  hasId(value) &&
  typeof value["bookId"] === "string" &&
  typeof value["bookTitle"] === "string" &&
  ["IMPORT", "EXPORT", "SALE", "RESTOCK", "ADJUST"].includes(String(value["type"])) &&
  typeof value["quantity"] === "number" &&
  Number.isSafeInteger(value["quantity"]) &&
  value["quantity"] > 0 &&
  typeof value["beforeStock"] === "number" &&
  Number.isFinite(value["beforeStock"]) &&
  value["beforeStock"] >= 0 &&
  typeof value["afterStock"] === "number" &&
  Number.isFinite(value["afterStock"]) &&
  value["afterStock"] >= 0 &&
  typeof value["createdAt"] === "string" &&
  Number.isFinite(Date.parse(value["createdAt"]));
const isStocktake = (value: unknown): value is Stocktake =>
  hasId(value) &&
  typeof value["title"] === "string" &&
  value["title"].trim().length > 0 &&
  typeof value["auditDate"] === "string" &&
  Number.isFinite(Date.parse(value["auditDate"])) &&
  (value["status"] === "DRAFT" || value["status"] === "BALANCED") &&
  Array.isArray(value["items"]) &&
  new Set(value["items"].filter(isRecord).map((item) => item["bookId"])).size ===
    value["items"].length &&
  value["items"].every(
    (item) =>
      isRecord(item) &&
      typeof item["bookId"] === "string" &&
      typeof item["title"] === "string" &&
      Number.isSafeInteger(item["systemStock"]) &&
      typeof item["systemStock"] === "number" &&
      item["systemStock"] >= 0 &&
      Number.isSafeInteger(item["actualStock"]) &&
      typeof item["actualStock"] === "number" &&
      item["actualStock"] >= 0 &&
      Number.isSafeInteger(item["diffQuantity"]) &&
      typeof item["diffQuantity"] === "number" &&
      item["diffQuantity"] === item["actualStock"] - item["systemStock"],
  ) &&
  Number.isSafeInteger(value["totalSystemStock"]) &&
  typeof value["totalSystemStock"] === "number" &&
  Number.isSafeInteger(value["totalActualStock"]) &&
  typeof value["totalActualStock"] === "number" &&
  Number.isSafeInteger(value["totalDiff"]) &&
  typeof value["totalDiff"] === "number" &&
  value["totalSystemStock"] ===
    value["items"].reduce(
      (sum, item) => sum + (isRecord(item) ? (item["systemStock"] as number) : 0),
      0,
    ) &&
  value["totalActualStock"] ===
    value["items"].reduce(
      (sum, item) => sum + (isRecord(item) ? (item["actualStock"] as number) : 0),
      0,
    ) &&
  value["totalDiff"] === value["totalActualStock"] - value["totalSystemStock"] &&
  (value["note"] === undefined || typeof value["note"] === "string") &&
  (value["auditedBy"] === undefined || typeof value["auditedBy"] === "string") &&
  (value["createdAt"] === undefined ||
    (typeof value["createdAt"] === "string" && Number.isFinite(Date.parse(value["createdAt"])))) &&
  (value["balancedAt"] === undefined ||
    (typeof value["balancedAt"] === "string" &&
      Number.isFinite(Date.parse(value["balancedAt"])))) &&
  (value["status"] !== "BALANCED" || typeof value["balancedAt"] === "string");

function assertCollection(
  value: unknown,
  name: string,
  validator: (item: unknown) => boolean,
): asserts value is unknown[] {
  if (!Array.isArray(value) || !value.every(validator)) {
    throw new Error(`Dữ liệu ${name} trong bộ nhớ lưu trữ không hợp lệ.`);
  }
}

function normalizeState(value: unknown): AppState {
  if (!isRecord(value)) throw new Error("Cấu trúc state không hợp lệ.");
  const seed = createSeedState();
  const merged = { ...seed, ...value };

  assertCollection(merged.books, "sách", isBook);
  assertCollection(merged.orders, "đơn hàng", isOrder);
  assertCollection(merged.imports, "phiếu nhập", isReceipt);
  assertCollection(merged.exports, "phiếu xuất", isReceipt);
  assertCollection(merged.shipments, "vận chuyển", isShipping);
  assertCollection(merged.categories, "thể loại", isNamedEntity);
  assertCollection(merged.publishers, "nhà xuất bản", isNamedEntity);
  assertCollection(merged.suppliers, "nhà cung cấp", isSupplier);
  assertCollection(merged.customers, "khách hàng", isCustomer);
  assertCollection(merged.users, "người dùng", isUser);
  assertCollection(merged.movements, "biến động tồn kho", isMovement);
  assertCollection(merged.stocktakes, "phiếu kiểm kê", isStocktake);
  if (
    !Array.isArray(merged.processedOperationKeys) ||
    !merged.processedOperationKeys.every((key) => typeof key === "string")
  ) {
    throw new Error("Danh sách thao tác đã xử lý không hợp lệ.");
  }
  const collections = [
    ["sách", merged.books],
    ["đơn hàng", merged.orders],
    ["phiếu nhập", merged.imports],
    ["phiếu xuất", merged.exports],
    ["vận chuyển", merged.shipments],
    ["thể loại", merged.categories],
    ["nhà xuất bản", merged.publishers],
    ["nhà cung cấp", merged.suppliers],
    ["khách hàng", merged.customers],
    ["người dùng", merged.users],
    ["biến động tồn kho", merged.movements],
    ["phiếu kiểm kê", merged.stocktakes],
  ] as const;
  for (const [name, collection] of collections) {
    const ids = collection.map((item) => (isRecord(item) ? item["id"] : undefined));
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Dữ liệu ${name} có ID trùng lặp.`);
    }
  }

  return merged as AppState;
}

function createSeedState(): AppState {
  const distinct = (values: string[]) => [...new Set(values)];
  return clone({
    books: mockBooks,
    orders: mockOrders,
    imports: mockImportReceipts,
    exports: mockExportReceipts,
    shipments: mockShipments,
    categories: categories.map((name, index) => ({ id: `CAT-${index + 1}`, name })),
    publishers: publishers.map((name, index) => ({ id: `PUB-${index + 1}`, name })),
    suppliers: distinct([
      ...mockSuppliers,
      ...mockImportReceipts.map((receipt) => receipt.supplier),
    ]).map((name, index) => ({ id: `SUP-${index + 1}`, name })),
    customers: [],
    users: mockUsers,
    movements: [],
    stocktakes: [],
    processedOperationKeys: [],
  });
}

function freezeState(value: AppState): AppState {
  const freeze = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(freeze);
      Object.freeze(item);
    } else if (isRecord(item)) {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
  };
  freeze(value);
  return value;
}

function getBrowserStorage(): StoreStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch (error) {
    console.error("Không thể truy cập localStorage:", error);
    return unavailableStorage;
  }
}

export function createAppStore(storage: StoreStorage | null = getBrowserStorage()): {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AppState;
  getServerSnapshot: () => AppState;
  setState: (patch: Partial<AppState>) => void;
  resetDemo: () => AppState;
  hasProcessedOperation: (key: string) => boolean;
} {
  let state = freezeState(createSeedState());
  const listeners = new Set<() => void>();

  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isRecord(parsed) && "version" in parsed) {
          if (parsed["version"] !== 3 && parsed["version"] !== STORAGE_VERSION) {
            throw new Error(`Phiên bản dữ liệu không được hỗ trợ: ${String(parsed["version"])}.`);
          }
          state = freezeState(normalizeState(parsed["state"]));
        } else {
          // The previous v2 format stored AppState directly without an envelope.
          state = freezeState(normalizeState(parsed));
        }
      }
    } catch (error) {
      console.error("Không thể khôi phục state demo; sử dụng dữ liệu seed:", error);
    }
  }

  const commit = (next: AppState) => {
    const validated = normalizeState(clone(next));
    if (storage) {
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: STORAGE_VERSION, state: validated }),
        );
      } catch (error) {
        throw new StorePersistenceError(
          error instanceof Error ? error.message : "Không thể lưu dữ liệu demo.",
        );
      }
    }
    state = freezeState(validated);
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => state,
    setState(patch) {
      commit({ ...state, ...patch });
    },
    resetDemo() {
      const reset = createSeedState();
      commit(reset);
      return state;
    },
    hasProcessedOperation(key) {
      return state.processedOperationKeys.includes(key);
    },
  };
}

export const store = createAppStore();

export const bookStatusOf = (stock: number, minStock: number): Book["status"] =>
  stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK";

export const nextId = (prefix: string, existing: { id: string }[], base = 0) => {
  const maxExisting = existing.reduce((max, entity) => {
    const match = entity.id.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, base);
  return `${prefix}-${maxExisting + 1}`;
};
