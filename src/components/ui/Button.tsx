"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

/* ═══════════════ Botones ═══════════════ */

type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "lime" | "dangerSoft";
  size?: "sm" | "md";
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
};
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: BtnProps) {
  const v = {
    primary: "bg-purple text-white hover:bg-[#5350d6] shadow-[0_4px_12px_rgba(94,91,226,0.28)]",
    secondary:
      "bg-white text-ink shadow-[inset_0_0_0_1px_#E3E0D9] hover:bg-bo-soft hover:shadow-[inset_0_0_0_1px_#D6D2C9]",
    ghost: "text-ink-70 hover:bg-ink/[0.05] hover:text-ink",
    danger: "bg-bad text-white hover:bg-[#9e2828]",
    dangerSoft: "bg-bad-bg text-bad hover:bg-[#fbd3d3]",
    lime: "bg-lime text-ink hover:bg-[#e2fa5c]",
  }[variant];
  const s =
    size === "sm"
      ? "h-[32px] px-3 text-[13px] gap-1.5 rounded-[10px]"
      : "h-[40px] px-4 text-[14px] gap-2 rounded-[12px]";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex shrink-0 press items-center justify-center font-bold whitespace-nowrap disabled:opacity-45",
        v,
        s,
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  tone = "default",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger" | "onViolet";
}) {
  const t = {
    default: "text-ink-60 hover:bg-ink/[0.06] hover:text-ink",
    danger: "text-ink-60 hover:bg-bad-bg hover:text-bad",
    onViolet: "text-white hover:bg-white/15",
  }[tone];
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      className={cx(
        "flex h-[34px] w-[34px] shrink-0 press items-center justify-center rounded-[10px] disabled:opacity-40",
        t,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
