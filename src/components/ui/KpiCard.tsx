"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";
import { TONE, type ToneId } from "@/lib/tones";

/* ═══════════════ Figuras de la marca (las de los integrantes, como en Recursos) ═══════════════ */

export type FigureId = "circles" | "halves" | "quarters" | "leaves" | "rings";
/* La figura va siempre en la esquina de abajo a la derecha, cortada por el borde (nunca detrás de un texto) */
export function Figure({
  kind,
  color,
  w = 120,
  h = 92,
  className,
}: {
  kind: FigureId;
  color: string;
  w?: number;
  h?: number;
  className?: string;
}) {
  const r = h * 0.46;
  const art = {
    circles: (
      <>
        <circle cx={w - r * 0.35} cy={h - r * 0.2} r={r} />
        <circle cx={w - r * 1.55} cy={h + r * 0.35} r={r * 0.8} />
      </>
    ),
    halves: (
      <>
        <path d={`M${w} ${h - 2 * r}A${r} ${r} 0 0 0 ${w} ${h}Z`} />
        <path d={`M${w - r * 1.15} ${h - r * 1.1}A${r * 0.75} ${r * 0.75} 0 0 0 ${w - r * 1.15} ${h + r * 0.4}Z`} />
      </>
    ),
    quarters: (
      <>
        <path d={`M${w} ${h}L${w - r * 1.6} ${h}A${r * 1.6} ${r * 1.6} 0 0 1 ${w} ${h - r * 1.6}Z`} />
        <path
          d={`M${w - r * 1.75} ${h}L${w - r * 1.75} ${h - r * 0.8}A${r * 0.8} ${r * 0.8} 0 0 1 ${w - r * 0.95} ${h}Z`}
        />
      </>
    ),
    leaves: [0, 1].map((k) => {
      const cx = w - r * (0.3 + k * 1.05);
      const rr = r * 1.15;
      const hh = r * (k ? 0.75 : 1);
      const cy = h - hh * 0.35;
      return (
        <path key={k} d={`M${cx} ${cy - hh}A${rr} ${rr} 0 0 0 ${cx} ${cy + hh}A${rr} ${rr} 0 0 0 ${cx} ${cy - hh}Z`} />
      );
    }),
    rings: [0, 1, 2].map((k) => (
      <circle key={k} cx={w} cy={h} r={r * (0.6 + k * 0.55)} fill="none" stroke={color} strokeWidth={r * 0.18} />
    )),
  }[kind];
  return (
    <svg
      aria-hidden
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cx("pointer-events-none absolute right-0 bottom-0", className)}
      fill={color}
      overflow="hidden"
    >
      {art}
    </svg>
  );
}

/* ═══════════════ Tarjeta de cifra (con su color y su figura) ═══════════════ */

export function StatTile({
  tone,
  figure,
  label,
  value,
  note,
  extra,
  onClick,
  icon,
  selected,
  className,
}: {
  tone: ToneId;
  figure?: FigureId;
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  /** Algo chico al lado del número (una flecha de cambio, un badge) */
  extra?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": selected } : {})}
      className={cx(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] p-5 text-left",
        onClick &&
          "press transition-[box-shadow,transform] duration-200 hover:shadow-[0_10px_26px_rgba(36,35,35,0.10)]",
        selected && "shadow-[0_0_0_3px_#242323]!",
        className,
      )}
      style={{ background: t.bg, color: t.ink }}
    >
      {figure && <Figure kind={figure} color={t.deep} w={110} h={86} />}
      <span className="relative flex items-center gap-2 text-[13px] font-bold" style={{ color: t.sub }}>
        {icon && (
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px]"
            style={{ background: t.chip }}
          >
            {icon}
          </span>
        )}
        {label}
        {onClick && (
          <Icon.arrowRight size={14} className="opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        )}
      </span>
      <span className="relative mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[36px] leading-none font-black tracking-[-0.035em]">{value}</span>
        {extra}
      </span>
      {note && (
        <span className="relative mt-2 text-[13px] leading-[1.4] font-medium" style={{ color: t.sub }}>
          {note}
        </span>
      )}
    </Tag>
  );
}

/* Título de sección con su ícono de color (para separar bloques sin agregar cajas) */
export function SectionTitle({
  tone,
  icon,
  title,
  sub,
  actions,
}: {
  tone: ToneId;
  icon: ReactNode;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: t.bg, color: tone === "violet" ? "#fff" : t.sub }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[20px] leading-[1.15] font-black tracking-[-0.02em] text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[13.5px] font-medium text-ink-60">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
