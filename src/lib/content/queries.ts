import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CONTENT_PATH, type ContentItemMap, type ContentKind } from "./types";

/*
 * Content lists are not paged and come ordered by sortOrder. We always fetch the whole list of a language (drafts
 * included) and filter by status/search on the client: reordering needs every id of that language anyway.
 * Keys: ["content", kind, language].
 */

export const contentKey = (kind: ContentKind, language?: string) =>
  language ? (["content", kind, language] as const) : (["content", kind] as const);

export const contentListQuery = <K extends ContentKind>(kind: K, language: string) =>
  queryOptions({
    queryKey: contentKey(kind, language),
    queryFn: ({ signal }) =>
      api<ContentItemMap[K][]>(`/api/backoffice/content/${CONTENT_PATH[kind]}`, { query: { language }, signal }),
    staleTime: 60_000,
  });

export const useContentList = <K extends ContentKind>(kind: K, language: string) =>
  useQuery(contentListQuery(kind, language));
