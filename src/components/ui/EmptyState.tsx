"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";

/* ═══════════════ Vacío y carga ═══════════════ */

export function EmptyState({
  icon,
  title,
  text,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14")}>
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-purple-10 text-purple">
        {icon ?? <Icon.search size={22} />}
      </span>
      <p className="mt-3.5 text-[15.5px] font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-[42ch] text-[13.5px] leading-[1.5] font-medium text-ink-60">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
