import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RangeId, TrackingFilters } from "@/lib/filters";
import { listQuery, type ListParams } from "@/lib/queries";
import type {
  BreakupMotivesEntry,
  CancelReason,
  ChatMessage,
  CountryUsers,
  OnboardingFilter,
  OnboardingFunnel,
  Overview,
  Paged,
  SubscriptionFilter,
  SubscriptionsMetrics,
  UsageMetrics,
  UserDetail,
  UserListItem,
} from "./types";

/*
 * Tracking read hooks (docs/API.md §1–2). Keys: ["tracking", resource, ...inputs]. Overview and onboarding take the
 * country and language filters too; the other metrics only take `range`.
 */

export interface UserListFilters {
  search: string;
  onboarding: OnboardingFilter | null;
  subscription: SubscriptionFilter | null;
  /** Onboarding answer filter: users whose answer to any of `questions` includes any of `answers`. */
  answer?: { questions: string[]; answers: string[] } | null;
  country?: string | null;
  language?: string | null;
  /** People with an account whose onboarding stopped on this screen. */
  leftAt?: string | null;
}

export const usersQueryParams = (f: UserListFilters, list: ListParams) => ({
  search: f.search.trim() || undefined,
  onboarding: f.onboarding ?? undefined,
  subscription: f.subscription ?? undefined,
  question: f.answer?.questions,
  answer: f.answer?.answers,
  country: f.country ?? undefined,
  language: f.language ?? undefined,
  leftAt: f.leftAt ?? undefined,
  ...listQuery(list),
});

export const usersQuery = (f: UserListFilters, list: ListParams) =>
  queryOptions({
    queryKey: ["tracking", "users", f, list],
    queryFn: ({ signal }) =>
      api<Paged<UserListItem>>("/api/backoffice/users", { query: usersQueryParams(f, list), signal }),
  });
export const useUsers = (f: UserListFilters, list: ListParams, enabled = true) =>
  useQuery({ ...usersQuery(f, list), enabled });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: ["tracking", "user", id],
    queryFn: ({ signal }) => api<UserDetail>(`/api/backoffice/users/${encodeURIComponent(id)}`, { signal }),
  });
/* No placeholder: while another person loads, never show the previous one. */
export const useUser = (id: string) => useQuery({ ...userQuery(id), placeholderData: undefined });

export const ninetyMessagesQuery = (id: string, page: number, pageSize: number) =>
  queryOptions({
    queryKey: ["tracking", "user", id, "ninety", page, pageSize],
    queryFn: ({ signal }) =>
      api<Paged<ChatMessage>>(`/api/backoffice/users/${encodeURIComponent(id)}/ninety`, {
        query: { page, pageSize },
        signal,
      }),
  });
export const useNinetyMessages = (id: string, page: number, pageSize: number) =>
  useQuery({ ...ninetyMessagesQuery(id, page, pageSize), placeholderData: keepPreviousData });

export const countriesQuery = () =>
  queryOptions({
    queryKey: ["tracking", "countries"],
    queryFn: ({ signal }) => api<CountryUsers[]>("/api/backoffice/users/countries", { signal }),
    staleTime: 5 * 60_000,
  });
export const useCountries = (enabled = true) => useQuery({ ...countriesQuery(), enabled });

const metricsParams = (f: TrackingFilters) => ({
  range: f.range,
  country: f.country === "all" ? undefined : f.country,
  language: f.lang === "all" ? undefined : f.lang,
});

export const overviewQuery = (f: TrackingFilters) =>
  queryOptions({
    queryKey: ["tracking", "overview", f],
    queryFn: ({ signal }) => api<Overview>("/api/backoffice/metrics/overview", { query: metricsParams(f), signal }),
  });
export const useOverview = (f: TrackingFilters) => useQuery({ ...overviewQuery(f), placeholderData: keepPreviousData });

export const onboardingFunnelQuery = (f: TrackingFilters) =>
  queryOptions({
    queryKey: ["tracking", "onboarding", f],
    queryFn: ({ signal }) =>
      api<OnboardingFunnel>("/api/backoffice/metrics/onboarding", { query: metricsParams(f), signal }),
  });
export const useOnboardingFunnel = (f: TrackingFilters) =>
  useQuery({ ...onboardingFunnelQuery(f), placeholderData: keepPreviousData });

export const breakupMotivesQuery = (f: TrackingFilters, list: ListParams) =>
  queryOptions({
    queryKey: ["tracking", "breakupMotives", f, list],
    queryFn: ({ signal }) =>
      api<Paged<BreakupMotivesEntry>>("/api/backoffice/metrics/onboarding/breakup-motives", {
        query: { ...metricsParams(f), ...listQuery(list) },
        signal,
      }),
  });
export const useBreakupMotives = (f: TrackingFilters, list: ListParams) =>
  useQuery({ ...breakupMotivesQuery(f, list), placeholderData: keepPreviousData });

export const subscriptionsMetricsQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["tracking", "subscriptions", range],
    queryFn: ({ signal }) =>
      api<SubscriptionsMetrics>("/api/backoffice/metrics/subscriptions", { query: { range }, signal }),
  });
export const useSubscriptionsMetrics = (range: RangeId) => useQuery(subscriptionsMetricsQuery(range));

export const cancelReasonsQuery = (range: RangeId, list: ListParams) =>
  queryOptions({
    queryKey: ["tracking", "cancelReasons", range, list],
    queryFn: ({ signal }) =>
      api<Paged<CancelReason>>("/api/backoffice/metrics/subscriptions/cancel-reasons", {
        query: { range, ...listQuery(list) },
        signal,
      }),
  });
export const useCancelReasons = (range: RangeId, list: ListParams) =>
  useQuery({ ...cancelReasonsQuery(range, list), placeholderData: keepPreviousData });

export const usageQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["tracking", "usage", range],
    queryFn: ({ signal }) => api<UsageMetrics>("/api/backoffice/metrics/usage", { query: { range }, signal }),
  });
export const useUsage = (range: RangeId) => useQuery(usageQuery(range));
