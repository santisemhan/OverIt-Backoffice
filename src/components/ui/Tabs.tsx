"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { HScroll } from "./HScroll";

/* ═══════════════ Control segmentado (con el fondo que se desliza) ═══════════════ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  tone = "light",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  tone?: "light" | "violet";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(value)}"]`);
    if (!el) return;
    const measure = () => setThumb({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, [value, options.length]);
  const violet = tone === "violet";
  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      className={cx("relative inline-flex shrink-0 rounded-[12px] p-[3px]", violet ? "bg-white/12" : "bg-[#ECE9E2]")}
    >
      {thumb && (
        <span
          aria-hidden
          className={cx(
            "absolute top-[3px] bottom-[3px] rounded-[9px] transition-[transform,width] duration-[260ms] ease-[var(--ease-out)]",
            violet ? "bg-lime" : "bg-white shadow-[0_1px_2px_rgba(36,35,35,0.08),0_2px_8px_rgba(36,35,35,0.06)]",
          )}
          style={{ width: thumb.w, transform: `translateX(${thumb.x - 3}px)`, left: 3 }}
        />
      )}
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-id={o.id}
            onClick={() => onChange(o.id)}
            className={cx(
              "relative z-[1] flex items-center justify-center gap-1.5 rounded-[9px] font-bold whitespace-nowrap transition-colors duration-200",
              size === "sm" ? "h-[28px] px-2.5 text-[12.5px]" : "h-[34px] px-3.5 text-[13.5px]",
              violet
                ? on
                  ? "text-ink"
                  : "text-white hover:text-white"
                : on
                  ? "text-ink"
                  : "text-ink-60 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════ Pestañas (subrayado que se desliza) ═══════════════ */

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: ReactNode; count?: number; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(value)}"]`);
    if (!el) return;
    const measure = () => setBar({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, [value, items.length]);
  return (
    <HScroll label={label} arrows={false} fade="#F5F3EE" className="-mx-1" innerClassName="no-scrollbar px-1">
      <div
        ref={wrap}
        role="tablist"
        aria-label={label}
        className="relative flex min-w-max gap-1 border-b border-bo-line"
      >
        {items.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              data-id={t.id}
              disabled={t.disabled}
              onClick={() => onChange(t.id)}
              className={cx(
                "flex h-[42px] items-center gap-1.5 rounded-t-[8px] px-3 text-[14px] font-bold whitespace-nowrap transition-colors disabled:opacity-40",
                on ? "text-ink" : "text-ink-60 hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cx(
                    "rounded-full px-1.5 py-px text-[11.5px] tnum",
                    on ? "bg-purple text-white" : "bg-[#ECE9E2] text-ink-70",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        {bar && (
          <span
            aria-hidden
            className="absolute -bottom-px left-0 h-[2.5px] rounded-full bg-purple transition-[transform,width] duration-[260ms] ease-[var(--ease-out)]"
            style={{ width: bar.w, transform: `translateX(${bar.x}px)` }}
          />
        )}
      </div>
    </HScroll>
  );
}
