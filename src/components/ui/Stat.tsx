"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";

export function Num({
  value,
  format = (v: number) => new Intl.NumberFormat("es-AR").format(Math.round(v)),
}: {
  value: number;
  format?: (v: number) => string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const first = useRef(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = first.current ? 0 : from.current;
    first.current = false;
    if (reduce || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    const t0 = performance.now();
    const dur = 520;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = start + (value - start) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tnum">{format(shown)}</span>;
}

/* ═══════════════ Cifras ═══════════════ */

export function Delta({
  value,
  goodUp = true,
  suffix = "%",
}: {
  value: number | null;
  goodUp?: boolean;
  suffix?: string;
}) {
  if (value === null || !isFinite(value) || Math.abs(value) < 0.05) return null;
  const up = value > 0.05;
  const down = value < -0.05;
  const good = (up && goodUp) || (down && !goodUp);
  const bad = (down && goodUp) || (up && !goodUp);
  const txt = `${up ? "+" : ""}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[12px] font-bold tnum",
        good ? "bg-ok-bg text-ok" : bad ? "bg-bad-bg text-bad" : "bg-[#F0EEE9] text-ink-70",
      )}
    >
      {up ? <Icon.up size={12} strokeWidth={2.4} /> : down ? <Icon.down size={12} strokeWidth={2.4} /> : null}
      {txt}
    </span>
  );
}

/* Una barra fina de avance (el riel es un paso más claro del mismo color) */
export function Meter({
  value,
  color = "#5E5BE2",
  track = "#EFEEFC",
  h = 6,
  label,
}: {
  value: number;
  color?: string;
  track?: string;
  h?: number;
  label?: string;
}) {
  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className="relative block w-full overflow-hidden rounded-full"
      style={{ height: h, background: track }}
    >
      <span
        className="absolute inset-y-0 left-0 grow-x rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </span>
  );
}
