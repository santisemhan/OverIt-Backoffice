import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { contentKey } from "./queries";
import {
  CONTENT_PATH,
  type AnyContent,
  type Challenge,
  type ContentInputMap,
  type ContentItemMap,
  type ContentKind,
} from "./types";

/*
 * Writes for /api/backoffice/content/*. Every hook invalidates ["content", kind] (all languages) when it settles.
 * Reorder is optimistic so drag and drop feels instant; it rolls back if the server refuses.
 */

const base = (kind: ContentKind) => `/api/backoffice/content/${CONTENT_PATH[kind]}`;

/** Full PUT/POST body from a stored item (used for status toggles, undo and duplicates). */
export function toInput<K extends ContentKind>(kind: K, item: ContentItemMap[K]): ContentInputMap[K] {
  const common = { language: item.language, status: item.status };
  switch (kind) {
    case "challenges": {
      const c = item as Challenge;
      return {
        ...common,
        title: c.title,
        action: c.action,
        type: c.type,
        inputDefinitions: c.type === "InApp" ? (c.inputDefinitions ?? []).map((d) => ({ ...d })) : undefined,
      } as ContentInputMap[K];
    }
    case "breathings": {
      const b = item as ContentItemMap["breathings"];
      return {
        ...common,
        title: b.title,
        description: b.description,
        type: b.type,
        cicle: b.cicle,
      } as ContentInputMap[K];
    }
    case "resources": {
      const r = item as ContentItemMap["resources"];
      return {
        ...common,
        titleParts: r.titleParts,
        description: r.description,
        content: r.content,
        category: r.category,
        type: r.type,
      } as ContentInputMap[K];
    }
    case "phrases": {
      const p = item as ContentItemMap["phrases"];
      return { ...common, parts: p.parts, author: p.author } as ContentInputMap[K];
    }
    default: {
      const f = item as ContentItemMap["facts"];
      return { ...common, text: f.text } as ContentInputMap[K];
    }
  }
}

export function useCreateContent<K extends ContentKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContentInputMap[K]) => api<{ id: string }>(base(kind), { method: "POST", body: input }),
    onSettled: () => qc.invalidateQueries({ queryKey: contentKey(kind) }),
  });
}

export function useUpdateContent<K extends ContentKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContentInputMap[K] }) =>
      api<void>(`${base(kind)}/${id}`, { method: "PUT", body: input }),
    onSettled: () => qc.invalidateQueries({ queryKey: contentKey(kind) }),
  });
}

export function useDeleteContent(kind: ContentKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`${base(kind)}/${id}`, { method: "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: contentKey(kind) }),
  });
}

/** Days of published challenges follow the list order (1-based), drafts have none. */
function withDays(list: Challenge[]): Challenge[] {
  let d = 0;
  return list.map((c) => ({ ...c, day: c.status === "Published" ? ++d : null }));
}

export function useReorderContent(kind: ContentKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ language, ids }: { language: string; ids: string[] }) =>
      api<void>(`${base(kind)}/order`, { method: "PUT", body: { language, ids } }),
    onMutate: async ({ language, ids }) => {
      const key = contentKey(kind, language);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AnyContent[]>(key);
      if (previous) {
        const byId = new Map(previous.map((x) => [x.id, x]));
        let next = ids.map((id, i) => ({ ...byId.get(id)!, sortOrder: i })).filter((x) => x.id);
        if (kind === "challenges") next = withDays(next as Challenge[]);
        qc.setQueryData(key, next);
      }
      return { previous, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: contentKey(kind) }),
  });
}
