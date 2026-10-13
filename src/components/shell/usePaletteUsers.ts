"use client";

import { createElement, useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { lookOf } from "@/lib/trackeo/labels";
import { useUsers } from "@/lib/trackeo/queries";

/** A result row of the ⌘K palette. */
export interface PaletteItem {
  id: string;
  group: "Secciones" | "Usuarios";
  label: string;
  sub: string;
  icon: ReactNode;
  href: string;
}

/**
 * Users shown in the ⌘K palette for a query (name, email or ID); with an empty query, the most recently active ones.
 * Debounced so typing does not fire a request per key.
 */
export function usePaletteUsers(query: string): { items: PaletteItem[]; loading: boolean } {
  const [search, setSearch] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const q = useUsers(
    { search, onboarding: null, subscription: null },
    { page: 1, pageSize: 6, sort: search ? null : { key: "lastLogin", desc: true } },
  );

  const items: PaletteItem[] = (q.data?.items ?? []).map((u) => ({
    id: `u-${u.id}`,
    group: "Usuarios",
    label: u.name?.trim() || "Sin nombre",
    sub: u.email,
    icon: createElement(Avatar, { look: lookOf(u.id), size: 26, muted: !u.name }),
    href: `/trackeo/usuarios/${u.id}`,
  }));
  return { items, loading: q.isFetching || search !== query };
}
