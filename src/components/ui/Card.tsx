"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { TONE, type ToneId } from "@/lib/tones";

/* ═══════════════ Paneles ═══════════════ */

export function Panel({
  title,
  sub,
  info,
  actions,
  children,
  className,
  pad = true,
  id,
  tone,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  info?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
  id?: string;
  tone?: ToneId;
}) {
  const t = tone ? TONE[tone] : null;
  return (
    <section
      id={id}
      className={cx(
        "min-w-0 rounded-[20px]",
        t ? "" : "bg-white shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)]",
        className,
      )}
      style={t ? { background: t.bg } : undefined}
    >
      {(title || actions) && (
        <header className={cx("flex items-start justify-between gap-x-4", pad ? "px-5 pt-5" : "px-5 pt-5 pb-1")}>
          <div className="min-w-0 flex-1">
            {title && (
              <h2
                className="flex items-center gap-2 text-[16px] leading-[1.3] font-bold tracking-[-0.01em]"
                style={{ color: t?.ink ?? "#242323" }}
              >
                {title}
                {info && <Info text={info} />}
              </h2>
            )}
            {sub && (
              <p className="mt-0.5 text-[13px] leading-[1.45] font-medium" style={{ color: t?.sub ?? "#6B6A6A" }}>
                {sub}
              </p>
            )}
          </div>
          {actions && (
            <div className="-mt-1 -mr-1.5 flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/* Un ícono (i) que explica algo al pasar el mouse (así los títulos quedan cortos) */
export function Info({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      role="img"
      data-tip={text}
      aria-label={text}
      className="inline-flex h-[18px] w-[18px] shrink-0 cursor-help items-center justify-center rounded-full bg-[#ECE9E2] text-[11px] font-black text-ink-60 not-italic transition-colors hover:bg-purple-10 hover:text-purple"
    >
      i
    </span>
  );
}
