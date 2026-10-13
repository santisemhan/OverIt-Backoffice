"use client";

import { useQueries } from "@tanstack/react-query";
import type { NavBadge } from "@/lib/nav";
import { contentListQuery } from "@/lib/contenido/queries";
import type { ContentKind } from "@/lib/contenido/types";
import { useContentLanguage } from "./language";

const BADGE: Record<ContentKind, NavBadge> = {
  challenges: "challenges",
  breathings: "breaths",
  resources: "articles",
  phrases: "phrases",
  facts: "facts",
};
const KINDS = Object.keys(BADGE) as ContentKind[];

/**
 * Contenido: how many items each collection has in the selected language (drafts included). Shares the list queries
 * (and their cache) with the Contenido pages, so opening a section costs no extra request.
 */
export function useContentBadges(): Partial<Record<NavBadge, number>> {
  const [lang] = useContentLanguage();
  const results = useQueries({ queries: KINDS.map((k) => contentListQuery(k, lang)) });
  const out: Partial<Record<NavBadge, number>> = {};
  results.forEach((r, i) => {
    if (r.data) out[BADGE[KINDS[i]]] = r.data.length;
  });
  return out;
}
