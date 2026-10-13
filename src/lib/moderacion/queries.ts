import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RangeId } from "@/lib/filters";
import type {
  AuditEntry,
  InboxItem,
  InboxStatus,
  InboxType,
  ModerationComment,
  ModerationCounts,
  ModerationKind,
  ModerationPost,
  ModerationStatus,
  NinetyMetrics,
  Paged,
} from "./types";

/* Read hooks for Moderación. Keys start with "moderacion"; mutations invalidate by that prefix. */

const BASE = "/api/backoffice";

export interface ModerationListParams {
  status: ModerationStatus;
  search: string;
  userId: string | null;
  page: number;
  pageSize: number;
}

export const moderationCountsQuery = () =>
  queryOptions({
    queryKey: ["moderacion", "counts"],
    queryFn: ({ signal }) => api<ModerationCounts>(`${BASE}/moderation/counts`, { signal }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
export const useModerationCounts = () => useQuery(moderationCountsQuery());

const listQuery = (p: ModerationListParams) => ({
  status: p.status,
  search: p.search.trim(),
  userId: p.userId,
  page: p.page,
  pageSize: p.pageSize,
});

export const moderationPostsQuery = (p: ModerationListParams) =>
  queryOptions({
    queryKey: ["moderacion", "posts", p],
    queryFn: ({ signal }) => api<Paged<ModerationPost>>(`${BASE}/moderation/posts`, { query: listQuery(p), signal }),
    placeholderData: keepPreviousData,
  });
export const useModerationPosts = (p: ModerationListParams) => useQuery(moderationPostsQuery(p));

export const moderationCommentsQuery = (p: ModerationListParams) =>
  queryOptions({
    queryKey: ["moderacion", "comments", p],
    queryFn: ({ signal }) =>
      api<Paged<ModerationComment>>(`${BASE}/moderation/comments`, { query: listQuery(p), signal }),
    placeholderData: keepPreviousData,
  });
export const useModerationComments = (p: ModerationListParams) => useQuery(moderationCommentsQuery(p));

/** Only the total of a list (pageSize=1), for the KPI tabs. */
export const moderationTotalQuery = (kind: ModerationKind, status: ModerationStatus, userId: string | null) =>
  queryOptions({
    queryKey: ["moderacion", kind, "total", status, userId],
    queryFn: ({ signal }) =>
      api<Paged<unknown>>(`${BASE}/moderation/${kind}`, {
        query: { status, userId, page: 1, pageSize: 1 },
        signal,
      }).then((r) => r.totalCount),
  });
export const useModerationTotal = (kind: ModerationKind, status: ModerationStatus, userId: string | null) =>
  useQuery(moderationTotalQuery(kind, status, userId));

export interface InboxParams {
  status: InboxStatus | null;
  type: InboxType | null;
  search: string;
  page: number;
  pageSize: number;
}

export const inboxQuery = (p: InboxParams) =>
  queryOptions({
    queryKey: ["moderacion", "inbox", p],
    queryFn: ({ signal }) =>
      api<Paged<InboxItem>>(`${BASE}/inbox`, {
        query: { status: p.status, type: p.type, search: p.search.trim(), page: p.page, pageSize: p.pageSize },
        signal,
      }),
    placeholderData: keepPreviousData,
  });
export const useInbox = (p: InboxParams) => useQuery(inboxQuery(p));

/** Total for a status and/or type (pageSize=1), for tab and chip counters. */
export const inboxTotalQuery = (status: InboxStatus | null, type: InboxType | null) =>
  queryOptions({
    queryKey: ["moderacion", "inbox", "total", status, type],
    queryFn: ({ signal }) =>
      api<Paged<InboxItem>>(`${BASE}/inbox`, { query: { status, type, page: 1, pageSize: 1 }, signal }).then(
        (r) => r.totalCount,
      ),
  });
export const useInboxTotal = (status: InboxStatus | null, type: InboxType | null) =>
  useQuery(inboxTotalQuery(status, type));

export interface AuditParams {
  search: string;
  page: number;
  pageSize: number;
}

export const auditQuery = (p: AuditParams) =>
  queryOptions({
    queryKey: ["moderacion", "audit", p],
    queryFn: ({ signal }) =>
      api<Paged<AuditEntry>>(`${BASE}/audit`, {
        query: { search: p.search.trim(), page: p.page, pageSize: p.pageSize },
        signal,
      }),
    placeholderData: keepPreviousData,
  });
export const useAudit = (p: AuditParams) => useQuery(auditQuery(p));

export const ninetyQuery = (range: RangeId) =>
  queryOptions({
    queryKey: ["moderacion", "ninety", range],
    queryFn: ({ signal }) => api<NinetyMetrics>(`${BASE}/metrics/ninety`, { query: { range }, signal }),
  });
export const useNinety = (range: RangeId) => useQuery(ninetyQuery(range));
