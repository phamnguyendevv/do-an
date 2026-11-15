export interface PaginatedResult<T> {
  data: T[];
  pagination: { total: number; page: number; size: number };
}

export async function fetchAllPages<T>(
  loadPage: (page: number, size: number) => Promise<PaginatedResult<T>>,
  size = 100,
): Promise<T[]> {
  const firstPage = await loadPage(1, size);
  const pageSize = Math.max(1, firstPage.pagination.size || size);
  const pageCount = Math.ceil(firstPage.pagination.total / pageSize);
  const pages = [firstPage];
  for (let page = 2; page <= pageCount; page += 1) {
    pages.push(await loadPage(page, pageSize));
  }
  return pages.flatMap((page) => page.data);
}
