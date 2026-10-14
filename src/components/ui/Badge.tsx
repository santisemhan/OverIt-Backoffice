"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/* ═══════════════ Etiquetas de estado (siempre con texto; el color nunca va solo) ═══════════════ */

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "lime" | "ink" | "yellow";
const TONES: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  yellow: "bg-[#FDF1CC] text-[#8A5F00]",
  bad: "bg-bad-bg text-bad",
  info: "bg-purple-10 text-info",
  neutral: "bg-[#F0EEE9] text-ink-70",
  lime: "bg-lime text-ink",
  ink: "bg-ink text-white",
};
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-bold whitespace-nowrap",
        size === "sm" ? "h-[20px] px-2 text-[11.5px]" : "h-[24px] px-2.5 text-[12.5px]",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
