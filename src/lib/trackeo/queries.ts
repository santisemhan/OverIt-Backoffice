import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RangeId } from "@/lib/filters";
import { listQuery, type ListParams } from "@/lib/queries";
import type {
  OnboardingFilter,
  Overview,
  Paged,
  SubscriptionFilter,
  SubscriptionsMetrics,
  UsageMetrics,
  UserDetail,
  UserListItem,
} from "./types";

/*
 * Trackeo read hooks (docs/API.md §1–2). Keys: ["trackeo", resource, ...inputs]. Metrics only take `range`: the
 * backend does not store country or app language, so those filters are not sent.
 */

export interface UserListFilters {
  search: string;
  onboarding: OnboardingFilter | null;
  subscription: SubscriptionFilter | null;
}

export const usersQueryParams = (f: UserListFilters, list: ListParams) => ({
  search: f.search.trim() || undefined,
  onboarding: f.onboarding ?? undefined,
  subscription: f.subscription ?? undefined,
  ...listQuery(list),
});

export const usersQuery = (f: UserListFilters, list: ListParams) =>
  queryOptions({
    queryKey: ["trackeo", "users", f, list],
    queryFn: ({ signal }) =>
      api<Paged<UserListItem>>("/api/backoffice/users", { query: usersQueryParams(f, list), signal }),
  });
export const useUsers = (f: UserListFilters, list: ListParams, enabled = true) =>
  useQuery({ ...usersQuery(f, list), enabled });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: ["trackeo", "user", id],
    queryFn: ({ signal }) => api<UserDetail>(`/api/backoffice/users/${encodeURIComponent(id)}`, { signal }),
  });
/* No placeholder: while another person loads, never show the previous one. */
export const useUser = (id: string) => useQuery({ ...userQuery(id), placeholderData: undefined });

export const overviewQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["trackeo", "overview", range],
    queryFn: ({ signal }) => api<Overview>("/api/backoffice/metrics/overview", { query: { range }, signal }),
  });
export const useOverview = (range: RangeId) => useQuery({ ...overviewQuery(range), placeholderData: keepPreviousData });

export const subscriptionsMetricsQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["trackeo", "subscriptions", range],
    queryFn: ({ signal }) =>
      api<SubscriptionsMetrics>("/api/backoffice/metrics/subscriptions", { query: { range }, signal }),
  });
export const useSubscriptionsMetrics = (range: RangeId) => useQuery(subscriptionsMetricsQuery(range));

export const usageQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["trackeo", "usage", range],
    queryFn: ({ signal }) => api<UsageMetrics>("/api/backoffice/metrics/usage", { query: { range }, signal }),
  });
export const useUsage = (range: RangeId) => useQuery(usageQuery(range));
