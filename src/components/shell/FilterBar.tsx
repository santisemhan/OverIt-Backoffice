"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Tabs";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { COUNTRIES, LANGS, RANGES, useTrackeoFilters, type Lang, type RangeId } from "@/lib/filters";
import { n } from "@/lib/format";

/** Downloads per option, shown next to each choice when the page has them. */
export interface FilterCounts {
  total?: number;
  byCountry?: Record<string, number>;
  byLang?: Partial<Record<Lang, number>>;
}

/* Country code in a small plate (emoji flags do not render the same everywhere). */
const Code = ({ c }: { c: string }) => (
  <span className="flex h-[20px] w-[28px] items-center justify-center rounded-[6px] bg-[#F0EEE9] text-[10.5px] font-black tracking-[0.02em] text-ink-70">
    {c}
  </span>
);

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/*
 * Trackeo filters: period, country and language (stored in the URL, see lib/filters.ts).
 *   - Desktop (≥1024px): a bar that floats at the top while scrolling.
 *   - Phone/tablet: one "Filtros" button with the current choice; opens a bottom sheet.
 * Render it as a sibling of the page header (not inside a card) so it can stick for the whole page.
 */
export function FilterBar({
  country = true,
  lang = true,
  counts,
}: {
  country?: boolean;
  lang?: boolean;
  counts?: FilterCounts;
}) {
  const { filters: f, set } = useTrackeoFilters();
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    /* Below 1280px the violet top bar (≈100px) sits above: stick right under it */
    const top = window.matchMedia("(min-width: 1280px)").matches ? 13 : 113;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: `-${top}px 0px 0px 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fmt = (v: number | undefined) => (v === undefined ? undefined : n(v));
  const rangeLabel = RANGES.find((r) => r.id === f.range)!.label;
  const countryLabel =
    f.country === "all" ? "Todos los países" : (COUNTRIES.find((c) => c.code === f.country)?.name ?? f.country);
  const langLabel = f.lang === "all" ? "Todos los idiomas" : LANGS[f.lang];
  const active = (f.country !== "all" ? 1 : 0) + (f.lang !== "all" ? 1 : 0);
  const shownTotal =
    f.country !== "all" ? counts?.byCountry?.[f.country] : f.lang !== "all" ? counts?.byLang?.[f.lang] : counts?.total;

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0" />
      {/* Desktop: floating bar */}
      <div
        className={cx(
          "sticky top-[112px] z-20 mb-6 hidden rounded-[18px] transition-[background-color,box-shadow,padding] duration-200 lg:block xl:top-3",
          stuck
            ? "bg-white/90 px-2.5 py-2 shadow-[0_0_0_1px_rgba(36,35,35,0.05),0_10px_30px_rgba(36,35,35,0.10)] backdrop-blur-md"
            : "py-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Período"
            value={f.range}
            onChange={(range: RangeId) => set({ range })}
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          />
          {country && (
            <Select
              label="País"
              value={f.country}
              onChange={(c) => set({ country: c })}
              className="w-[196px]"
              search="Buscar país"
              options={[
                {
                  id: "all",
                  label: "Todos los países",
                  hint: fmt(counts?.total),
                  icon: <Icon.globe size={17} />,
                  divider: true,
                },
                ...COUNTRIES.map((c) => ({
                  id: c.code,
                  label: c.name,
                  hint: fmt(counts?.byCountry?.[c.code]),
                  icon: <Code c={c.code} />,
                })),
              ]}
            />
          )}
          {lang && (
            <Select
              label="Idioma"
              value={f.lang}
              onChange={(l: Lang | "all") => set({ lang: l })}
              className="w-[204px]"
              options={[
                {
                  id: "all" as const,
                  label: "Todos los idiomas",
                  hint: fmt(counts?.total),
                  icon: <Icon.chat size={17} />,
                  divider: true,
                },
                ...(Object.keys(LANGS) as Lang[]).map((l) => ({
                  id: l,
                  label: LANGS[l],
                  hint: fmt(counts?.byLang?.[l]),
                  icon: <Code c={l.toUpperCase()} />,
                })),
              ]}
            />
          )}
          {active > 0 && (
            <button
              type="button"
              onClick={() => set({ country: "all", lang: "all" })}
              className="ml-1 inline-flex h-[34px] press items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-ink-60 hover:bg-ink/5 hover:text-ink"
            >
              <Icon.x size={14} strokeWidth={2.4} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Phone/tablet: one button with the current choice */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="mb-5 flex w-full press items-center gap-3 rounded-[16px] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)] lg:hidden"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-purple-10 text-purple">
          <Icon.calendar size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-ink">{rangeLabel}</span>
          <span className="block truncate text-[12.5px] font-medium text-ink-60">{`${countryLabel} · ${langLabel}`}</span>
        </span>
        <span className="inline-flex h-[32px] items-center gap-1.5 rounded-full bg-[#F0EEE9] px-3 text-[13px] font-bold text-ink">
          Filtros
          {active > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-purple px-1 text-[11px] text-white tnum">
              {active}
            </span>
          )}
        </span>
      </button>
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filtros"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!active}
              onClick={() => set({ country: "all", lang: "all" })}
              className="h-[46px] flex-1 press rounded-[14px] bg-white text-[15px] font-bold text-ink shadow-[inset_0_0_0_1px_#E3E0D9] disabled:opacity-40"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="h-[46px] flex-[2] press rounded-[14px] bg-purple text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(94,91,226,0.28)]"
            >
              {shownTotal === undefined ? "Ver resultados" : `Ver ${n(shownTotal)} descargas`}
            </button>
          </div>
        }
      >
        <p className="mt-2 mb-2 text-[13px] font-bold text-ink-70">Período</p>
        <div className="grid grid-cols-2 gap-2">
          {RANGES.map((r) => (
            <Choice key={r.id} on={f.range === r.id} onClick={() => set({ range: r.id })} label={r.label} />
          ))}
        </div>
        {lang && (
          <>
            <p className="mt-5 mb-2 text-[13px] font-bold text-ink-70">Idioma</p>
            <div className="grid grid-cols-3 gap-2">
              <Choice on={f.lang === "all"} onClick={() => set({ lang: "all" })} label="Todos" />
              {(Object.keys(LANGS) as Lang[]).map((l) => (
                <Choice key={l} on={f.lang === l} onClick={() => set({ lang: l })} label={LANGS[l]} />
              ))}
            </div>
          </>
        )}
        {country && (
          <>
            <p className="mt-5 mb-2 text-[13px] font-bold text-ink-70">País</p>
            <div className="relative mb-2">
              <Icon.search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-60"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar país"
                aria-label="Buscar país"
                className="h-[42px] w-full rounded-[12px] bg-white pr-3 pl-9 text-[14.5px] font-medium text-ink shadow-[inset_0_0_0_1px_#E3E0D9] placeholder:text-ink-60 focus-visible:shadow-[inset_0_0_0_2px_#5E5BE2]"
              />
            </div>
            <ul
              className="overflow-hidden rounded-[14px] bg-white shadow-[inset_0_0_0_1px_#EAE7E0]"
              role="radiogroup"
              aria-label="País"
            >
              {[{ code: "all", name: "Todos los países" }, ...COUNTRIES]
                .filter((c) => !q.trim() || norm(c.name).includes(norm(q.trim())))
                .map((c) => {
                  const on = f.country === c.code;
                  const count = c.code === "all" ? counts?.total : counts?.byCountry?.[c.code];
                  return (
                    <li key={c.code} className="border-b border-bo-line last:border-0">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set({ country: c.code })}
                        className={cx(
                          "flex h-[48px] w-full items-center gap-3 px-3.5 text-left",
                          on ? "bg-purple-10" : "active:bg-bo-soft",
                        )}
                      >
                        {c.code === "all" ? <Icon.globe size={18} className="text-ink-60" /> : <Code c={c.code} />}
                        <span
                          className={cx(
                            "min-w-0 flex-1 truncate text-[15px]",
                            on ? "font-bold text-purple" : "font-medium text-ink",
                          )}
                        >
                          {c.name}
                        </span>
                        {count !== undefined && (
                          <span className="text-[12.5px] font-bold text-ink-60 tnum">{n(count)}</span>
                        )}
                        <span className="flex w-[18px] justify-end text-purple">
                          {on && <Icon.check size={17} strokeWidth={2.6} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function Choice({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "h-[44px] press rounded-[12px] px-3 text-[14.5px] font-bold transition-colors",
        on
          ? "bg-purple text-white shadow-[0_4px_12px_rgba(94,91,226,0.25)]"
          : "bg-white text-ink shadow-[inset_0_0_0_1px_#E3E0D9]",
      )}
    >
      {label}
    </button>
  );
}
