"use client";

import type { ReactNode } from "react";

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
 * Users shown in the ⌘K palette for a query (name, email or #ID); with an empty query, the recently active ones.
 * Hook point: implement with a debounced useQuery against the users search endpoint and map rows to PaletteItem
 * (icon: <Avatar />, href: `/trackeo/usuarios/${id}`). Until then the palette only lists sections.
 */
export function usePaletteUsers(query: string): { items: PaletteItem[]; loading: boolean } {
  void query;
  return { items: [], loading: false };
}
