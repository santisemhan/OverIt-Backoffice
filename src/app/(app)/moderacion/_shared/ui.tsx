"use client";

import { useEffect, useState } from "react";
import { Avatar, type Look } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { n } from "@/lib/format";

/* Small pieces shared by the Moderación pages. */

const LOOKS: Look[] = ["peach", "mint", "ink", "violet", "lime", "lilac"];

/** Stable avatar look from a user id (the server has no avatar style). */
export function lookOf(id: string): Look {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return LOOKS[Math.abs(h) % LOOKS.length];
}

export function UserAvatar({ id, size = 34 }: { id: string; size?: number }) {
  return <Avatar look={lookOf(id)} size={size} />;
}

export const displayName = (u: { name: string | null; email?: string | null } | null) =>
  u ? u.name?.trim() || u.email || "Sin nombre" : "Cuenta eliminada";

/** Debounced value for search fields (avoids one request per keystroke). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** "Now" for relative times, refreshed every minute (render must stay pure). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Pager({
  page,
  totalPages,
  totalCount,
  onPage,
  busy,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPage: (p: number) => void;
  busy?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Páginas" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] font-medium text-ink-60 tnum">
        Página {n(page)} de {n(totalPages)} · {n(totalCount)} en total
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <Button size="sm" disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
