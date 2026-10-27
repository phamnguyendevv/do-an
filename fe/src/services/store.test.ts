import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockBooks } from "@/mock/books";
import { STORAGE_VERSION, createAppStore } from "./store";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    removeItem: vi.fn((key: string) => data.delete(key)),
    data,
  };
}

describe("application store persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("seeds mock data once and stores a versioned state envelope", () => {
    const storage = memoryStorage();
    const appStore = createAppStore(storage);
    expect(appStore.getSnapshot().books).toHaveLength(mockBooks.length);
    expect(storage.getItem).toHaveBeenCalledTimes(1);

    appStore.setState({ books: [] });
    const saved = JSON.parse(storage.data.get("bookstock_app_state_v2")!);
    expect(saved.version).toBe(STORAGE_VERSION);
    expect(saved.state.books).toEqual([]);
  });

  it("restores valid versioned data after reload", () => {
    const storage = memoryStorage();
    const first = createAppStore(storage);
    const books = first.getSnapshot().books.slice(0, 1);
    first.setState({ books });

    const restored = createAppStore(storage);
    expect(restored.getSnapshot().books).toEqual(books);
  });

  it("migrates the previous unversioned v2 payload and supplies new collections", () => {
    const storage = memoryStorage({
      bookstock_app_state_v2: JSON.stringify({ books: mockBooks.slice(0, 1) }),
    });
    const restored = createAppStore(storage);
    expect(restored.getSnapshot().books).toHaveLength(1);
    expect(restored.getSnapshot().users.length).toBeGreaterThan(0);
    expect(restored.getSnapshot().movements).toEqual([]);
  });

  it("migrates the prior versioned envelope to the current schema", () => {
    const storage = memoryStorage({
      bookstock_app_state_v2: JSON.stringify({
        version: 3,
        state: { books: mockBooks.slice(0, 1) },
      }),
    });
    const restored = createAppStore(storage);

    expect(restored.getSnapshot().books).toHaveLength(1);
    expect(restored.getSnapshot().stocktakes).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("uses seed state for incompatible persisted data", () => {
    const storage = memoryStorage({
      bookstock_app_state_v2: JSON.stringify({
        version: 999,
        state: {},
      }),
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const restored = createAppStore(storage);
    expect(restored.getSnapshot().books).toHaveLength(mockBooks.length);
    expect(error).toHaveBeenCalledOnce();
  });

  it("reports storage read failures and initializes demo seed data", () => {
    const storage = memoryStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const restored = createAppStore(storage);

    expect(restored.getSnapshot().books).toHaveLength(mockBooks.length);
    expect(error).toHaveBeenCalledOnce();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("keeps memory unchanged when persistence fails", () => {
    const storage = memoryStorage();
    const appStore = createAppStore(storage);
    const before = appStore.getSnapshot();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const listener = vi.fn();
    appStore.subscribe(listener);

    expect(() => appStore.setState({ books: [] })).toThrow("quota exceeded");
    expect(appStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("resets persisted business state to demo seed data", () => {
    const storage = memoryStorage();
    const appStore = createAppStore(storage);
    appStore.setState({ books: [], orders: [] });

    const reset = appStore.resetDemo();
    expect(reset.books).toHaveLength(mockBooks.length);
    expect(reset.orders).toEqual([]);
    expect(JSON.parse(storage.data.get("bookstock_app_state_v2")!).version).toBe(STORAGE_VERSION);
  });
});
