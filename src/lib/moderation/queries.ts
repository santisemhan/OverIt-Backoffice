import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RangeId } from "@/lib/filters";
import type {
  AuditEntry,
  InboxCounts,
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

/* Read hooks for Moderation. Keys start with "moderation"; mutations invalidate by that prefix. */

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
    queryKey: ["moderation", "counts"],
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
    queryKey: ["moderation", "posts", p],
    queryFn: ({ signal }) => api<Paged<ModerationPost>>(`${BASE}/moderation/posts`, { query: listQuery(p), signal }),
    placeholderData: keepPreviousData,
  });
export const useModerationPosts = (p: ModerationListParams) => useQuery(moderationPostsQuery(p));

export const moderationCommentsQuery = (p: ModerationListParams) =>
  queryOptions({
    queryKey: ["moderation", "comments", p],
    queryFn: ({ signal }) =>
      api<Paged<ModerationComment>>(`${BASE}/moderation/comments`, { query: listQuery(p), signal }),
    placeholderData: keepPreviousData,
  });
export const useModerationComments = (p: ModerationListParams) => useQuery(moderationCommentsQuery(p));

/** Only the total of a list (pageSize=1), for the KPI tabs. */
export const moderationTotalQuery = (kind: ModerationKind, status: ModerationStatus, userId: string | null) =>
  queryOptions({
    queryKey: ["moderation", kind, "total", status, userId],
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
    queryKey: ["moderation", "inbox", p],
    queryFn: ({ signal }) =>
      api<Paged<InboxItem>>(`${BASE}/inbox`, {
        query: { status: p.status, type: p.type, search: p.search.trim(), page: p.page, pageSize: p.pageSize },
        signal,
      }),
    placeholderData: keepPreviousData,
  });
export const useInbox = (p: InboxParams) => useQuery(inboxQuery(p));

/** Every tab and chip counter of the inbox, in one request. */
export const inboxCountsQuery = () =>
  queryOptions({
    queryKey: ["moderation", "inbox", "counts"],
    queryFn: ({ signal }) => api<InboxCounts>(`${BASE}/inbox/counts`, { signal }),
  });
export const useInboxCounts = () => useQuery(inboxCountsQuery());

/** Comments under one post (removed ones included), for the thread under a Comunidad card. */
export const postCommentsQuery = (postId: string) =>
  queryOptions({
    queryKey: ["moderation", "comments", "post", postId],
    queryFn: ({ signal }) =>
      api<Paged<ModerationComment>>(`${BASE}/moderation/comments`, {
        query: { postId, status: "any", page: 1, pageSize: 100 },
        signal,
      }),
  });
export const usePostComments = (postId: string, enabled: boolean) =>
  useQuery({ ...postCommentsQuery(postId), enabled });

export interface AuditParams {
  search: string;
  page: number;
  pageSize: number;
}

export const auditQuery = (p: AuditParams) =>
  queryOptions({
    queryKey: ["moderation", "audit", p],
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
    queryKey: ["moderation", "ninety", range],
    queryFn: ({ signal }) => api<NinetyMetrics>(`${BASE}/metrics/ninety`, { query: { range }, signal }),
  });
export const useNinety = (range: RangeId) => useQuery(ninetyQuery(range));
