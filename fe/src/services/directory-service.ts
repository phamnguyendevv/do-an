import type { Category, Customer, Publisher, Supplier, User } from "@/types";
import { nextId, store } from "./store";
import { serviceFailure, serviceSuccess, type ServiceResult } from "./service-result";

type DirectoryEntity = Category | Publisher | Supplier | Customer | User;
type DirectoryCollection = "categories" | "publishers" | "suppliers" | "customers" | "users";

const requiredText = (entity: DirectoryEntity): boolean =>
  "name" in entity && typeof entity.name === "string" && entity.name.trim().length > 0;
const normalizedPhone = (phone: string) => phone.replace(/\D/g, "").replace(/^84/, "0");

const validEntity = (entity: DirectoryEntity): boolean => {
  if (!requiredText(entity)) return false;
  if (
    "phone" in entity &&
    typeof entity.phone === "string" &&
    entity.phone.trim() !== "" &&
    !/^[+()\d\s.-]{6,20}$/.test(entity.phone)
  ) {
    return false;
  }
  if ("email" in entity) {
    if (
      typeof entity.email !== "string" ||
      (entity.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entity.email))
    ) {
      return false;
    }
  }
  if ("role" in entity && !["ADMIN", "STAFF"].includes(entity.role)) return false;
  if ("active" in entity && typeof entity.active !== "boolean") return false;
  return true;
};

function collection(collection: DirectoryCollection): DirectoryEntity[] {
  return store.getSnapshot()[collection] as DirectoryEntity[];
}

function persistCollection(collectionName: DirectoryCollection, entities: DirectoryEntity[]) {
  store.setState({ [collectionName]: entities });
}

function isReferenced(collectionName: DirectoryCollection, id: string): boolean {
  const state = store.getSnapshot();
  if (collectionName === "categories") {
    const category = state.categories.find((item) => item.id === id);
    return state.books.some((book) => book.categoryId === id || book.category === category?.name);
  }
  if (collectionName === "publishers") {
    const publisher = state.publishers.find((item) => item.id === id);
    return state.books.some(
      (book) => book.publisherId === id || book.publisher === publisher?.name,
    );
  }
  if (collectionName === "suppliers") {
    const supplier = state.suppliers.find((item) => item.id === id);
    return state.imports.some(
      (receipt) => receipt.supplierId === id || receipt.supplier === supplier?.name,
    );
  }
  if (collectionName === "customers") {
    const customer = state.customers.find((item) => item.id === id);
    return state.orders.some((order) => {
      if (order.customerId === id) return true;
      return customer
        ? normalizedPhone(order.customerPhone) === normalizedPhone(customer.phone)
        : false;
    });
  }
  if (collectionName === "users") {
    return state.movements.some((movement) => movement.createdBy === id);
  }
  return false;
}

function get<T extends DirectoryEntity>(
  collectionName: DirectoryCollection,
  id: string,
): ServiceResult<T> {
  const entity = collection(collectionName).find((item) => item.id === id);
  return entity
    ? serviceSuccess(entity as T)
    : serviceFailure("NOT_FOUND", "Không tìm thấy dữ liệu.");
}

function create<T extends DirectoryEntity>(
  collectionName: DirectoryCollection,
  prefix: string,
  input: Omit<T, "id">,
): ServiceResult<T> {
  const entity = {
    ...input,
    ...("name" in input && typeof input.name === "string" ? { name: input.name.trim() } : {}),
    id: nextId(prefix, collection(collectionName)),
  } as T;
  if (!validEntity(entity))
    return serviceFailure("VALIDATION_ERROR", "Thông tin nhập không hợp lệ.");
  const entities = collection(collectionName);
  const entityPhone = "phone" in entity ? entity.phone : undefined;
  if (
    "name" in entity &&
    typeof entity.name === "string" &&
    entities.some(
      (item) =>
        "name" in item &&
        typeof item.name === "string" &&
        item.name.trim().toLocaleLowerCase() === entity.name.trim().toLocaleLowerCase(),
    )
  ) {
    return serviceFailure("CONFLICT", "Tên đã được sử dụng.");
  }
  if (
    "email" in entity &&
    typeof entity.email === "string" &&
    entity.email.trim() !== "" &&
    entities.some(
      (item) =>
        "email" in item &&
        typeof item.email === "string" &&
        item.email.toLowerCase() === entity.email!.toLowerCase(),
    )
  ) {
    return serviceFailure("CONFLICT", "Email đã được sử dụng.");
  }
  if (
    collectionName === "customers" &&
    typeof entityPhone === "string" &&
    entities.some(
      (item) =>
        "phone" in item &&
        typeof item.phone === "string" &&
        normalizedPhone(item.phone) === normalizedPhone(entityPhone),
    )
  ) {
    return serviceFailure("CONFLICT", "Số điện thoại khách hàng đã được sử dụng.");
  }
  try {
    persistCollection(collectionName, [entity, ...entities]);
    return serviceSuccess(entity);
  } catch (error) {
    return serviceFailure(
      "PERSISTENCE_ERROR",
      error instanceof Error ? error.message : "Không thể lưu dữ liệu.",
    );
  }
}

function update<T extends DirectoryEntity>(
  collectionName: DirectoryCollection,
  id: string,
  patch: Partial<Omit<T, "id">>,
): ServiceResult<T> {
  const entities = collection(collectionName);
  const existing = entities.find((item) => item.id === id);
  if (!existing) return serviceFailure("NOT_FOUND", "Không tìm thấy dữ liệu.");
  const updated = {
    ...existing,
    ...patch,
    ...(typeof patch.name === "string" ? { name: patch.name.trim() } : {}),
  } as T;
  if (!validEntity(updated))
    return serviceFailure("VALIDATION_ERROR", "Thông tin nhập không hợp lệ.");
  const updatedPhone = "phone" in updated ? updated.phone : undefined;
  if (
    "name" in updated &&
    typeof updated.name === "string" &&
    entities.some(
      (item) =>
        item.id !== id &&
        "name" in item &&
        typeof item.name === "string" &&
        item.name.trim().toLocaleLowerCase() === updated.name.trim().toLocaleLowerCase(),
    )
  ) {
    return serviceFailure("CONFLICT", "Tên đã được sử dụng.");
  }
  if ("email" in updated && typeof updated.email === "string" && updated.email.trim() !== "") {
    const updatedEmail = updated.email.toLowerCase();
    const duplicateEmail = entities.some(
      (item) =>
        item.id !== id &&
        "email" in item &&
        typeof item.email === "string" &&
        item.email.toLowerCase() === updatedEmail,
    );
    if (duplicateEmail) {
      return serviceFailure("CONFLICT", "Email đã được sử dụng.");
    }
    if (
      collectionName === "customers" &&
      typeof updatedPhone === "string" &&
      entities.some(
        (item) =>
          item.id !== id &&
          "phone" in item &&
          typeof item.phone === "string" &&
          normalizedPhone(item.phone) === normalizedPhone(updatedPhone),
      )
    ) {
      return serviceFailure("CONFLICT", "Số điện thoại khách hàng đã được sử dụng.");
    }
  }
  try {
    const nextEntities = entities.map((item) => (item.id === id ? updated : item));
    const state = store.getSnapshot();
    if (collectionName === "categories") {
      const oldName = (existing as Category).name;
      const newName = (updated as Category).name;
      store.setState({
        categories: nextEntities as Category[],
        books: state.books.map((book) =>
          book.categoryId === id || book.category === oldName
            ? { ...book, category: newName, categoryId: id }
            : book,
        ),
      });
    } else if (collectionName === "publishers") {
      const oldName = (existing as Publisher).name;
      const newName = (updated as Publisher).name;
      store.setState({
        publishers: nextEntities as Publisher[],
        books: state.books.map((book) =>
          book.publisherId === id || book.publisher === oldName
            ? { ...book, publisher: newName, publisherId: id }
            : book,
        ),
      });
    } else {
      persistCollection(collectionName, nextEntities);
    }
    return serviceSuccess(updated);
  } catch (error) {
    return serviceFailure(
      "PERSISTENCE_ERROR",
      error instanceof Error ? error.message : "Không thể lưu dữ liệu.",
    );
  }
}

function remove(collectionName: DirectoryCollection, id: string): ServiceResult<void> {
  const entities = collection(collectionName);
  if (!entities.some((item) => item.id === id)) {
    return serviceFailure("NOT_FOUND", "Không tìm thấy dữ liệu.");
  }
  if (isReferenced(collectionName, id)) {
    return serviceFailure("CONFLICT", "Không thể xóa dữ liệu đang được nghiệp vụ khác tham chiếu.");
  }
  try {
    persistCollection(
      collectionName,
      entities.filter((item) => item.id !== id),
    );
    return serviceSuccess(undefined);
  } catch (error) {
    return serviceFailure(
      "PERSISTENCE_ERROR",
      error instanceof Error ? error.message : "Không thể lưu dữ liệu.",
    );
  }
}

function serviceFor<T extends DirectoryEntity>(
  collectionName: DirectoryCollection,
  prefix: string,
) {
  return {
    list: (): ServiceResult<T[]> => serviceSuccess(collection(collectionName) as T[]),
    get: (id: string) => get<T>(collectionName, id),
    create: (input: Omit<T, "id">) => create<T>(collectionName, prefix, input),
    update: (id: string, patch: Partial<Omit<T, "id">>) => update<T>(collectionName, id, patch),
    delete: (id: string) => remove(collectionName, id),
  };
}

export const categoryService = serviceFor<Category>("categories", "CAT");
export const publisherService = serviceFor<Publisher>("publishers", "PUB");
export const supplierService = serviceFor<Supplier>("suppliers", "SUP");
export const customerService = serviceFor<Customer>("customers", "CUS");
export const userService = serviceFor<User>("users", "USR");
