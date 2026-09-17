/**
 * Shared pagination helpers for list endpoints.
 *
 * Backward-compatible contract: endpoints return a plain array UNLESS the
 * caller passes `?page=` or `?limit=`, in which case they return a
 * `{ data, total, page, limit, totalPages }` envelope. This keeps dropdowns
 * and other full-fetch callers working while allowing paged UIs to fetch
 * small slices (critical on 0.5 CPU / 512MB instances).
 */

export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 50;

export function wantsPagination(query: any): boolean {
  return query?.page !== undefined || query?.limit !== undefined;
}

export function parsePagination(
  query: any,
  defaultLimit: number = DEFAULT_PAGE_LIMIT
): { page: number; limit: number; skip: number } {
  let page = parseInt(query?.page as string, 10);
  let limit = parseInt(query?.limit as string, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  limit = Math.min(limit, MAX_PAGE_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
