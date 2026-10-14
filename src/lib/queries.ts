import type { SortState } from "@/components/ui/DataTable";

/*
 * Read hooks live here, built with `queryOptions` so keys and fetchers travel together:
 *
 *   const usersQuery = (filters: TrackingFilters, list: ListParams) =>
 *     queryOptions({
 *       queryKey: ["tracking", "users", filters, list],
 *       queryFn: ({ signal }) => api<PagedResponse<UserRow>>("/api/backoffice/users", { query: {...}, signal }),
 *     });
 *   export const useUsers = (...) => useQuery(usersQuery(...));
 *
 * Keys start with the area ("tracking" | "moderation"), then the resource, then every input that
 * changes the result. Mutations invalidate by prefix.
 */

export const DEFAULT_PAGE_SIZE = 25;

/** What a paged list asks the server for. Always cached together. */
export interface ListParams {
  page: number;
  pageSize: number;
  sort: SortState | null;
}

/** Query string for a paged list: page, pageSize, sort, desc. */
export function listQuery({ page, pageSize, sort }: ListParams) {
  return { page, pageSize, sort: sort?.key, desc: sort ? sort.desc : undefined };
}
