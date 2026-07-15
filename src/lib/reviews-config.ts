export const REVIEWS_PAGE_SIZE = 9;

export function paginateReviews<T>(
  items: T[],
  page: number,
  pageSize = REVIEWS_PAGE_SIZE
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}
