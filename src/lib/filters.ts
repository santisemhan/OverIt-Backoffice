"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * Global Tracking filters (period, country, language), stored in the URL search params so every view is a shareable
 * link and survives a reload. Defaults are omitted from the URL: /tracking/overview means "Histórico, all, all".
 */

export type RangeId = "all" | "90" | "30" | "7";
export type Lang = "es" | "en";

export interface TrackingFilters {
  range: RangeId;
  /** ISO 3166-1 alpha-2, or "all". */
  country: string;
  lang: Lang | "all";
}

export const DEFAULT_FILTERS: TrackingFilters = { range: "all", country: "all", lang: "all" };

/* Histórico first (the team looks at it first), then the short periods. */
export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: "all", label: "Histórico", days: null },
  { id: "90", label: "90 días", days: 90 },
  { id: "30", label: "30 días", days: 30 },
  { id: "7", label: "7 días", days: 7 },
];

export const LANGS: Record<Lang, string> = { es: "Español", en: "English" };
export const langName = (l: string) => LANGS[l as Lang] ?? l;

/* Country names in Spanish from the ISO code (the filter lists the countries the server has users in). */
const REGIONS = new Intl.DisplayNames(["es"], { type: "region" });
export const countryName = (code: string) => (/^[A-Z]{2}$/.test(code) ? (REGIONS.of(code) ?? code) : code);

const PARAM = { range: "period", country: "country", lang: "language" } as const;

function parseFilters(params: URLSearchParams): TrackingFilters {
  const range = params.get(PARAM.range);
  const country = params.get(PARAM.country);
  const lang = params.get(PARAM.lang);
  return {
    range: RANGES.some((r) => r.id === range) ? (range as RangeId) : DEFAULT_FILTERS.range,
    country: country && /^[A-Z]{2}$/.test(country) ? country : DEFAULT_FILTERS.country,
    lang: lang === "es" || lang === "en" ? lang : DEFAULT_FILTERS.lang,
  };
}

/** Read and update the Tracking filters. `set` replaces history (filters are not navigation steps). */
export function useTrackingFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => parseFilters(params), [params]);

  const set = useCallback(
    (patch: Partial<TrackingFilters>) => {
      const next = { ...filters, ...patch };
      const q = new URLSearchParams(params);
      for (const key of Object.keys(PARAM) as (keyof TrackingFilters)[]) {
        if (next[key] === DEFAULT_FILTERS[key]) q.delete(PARAM[key]);
        else q.set(PARAM[key], next[key]);
      }
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [filters, params, pathname, router],
  );

  return { filters, set };
}

/** The filter part of the current query string, to carry filters across Tracking links. */
export function filtersQuery(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of Object.values(PARAM)) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
