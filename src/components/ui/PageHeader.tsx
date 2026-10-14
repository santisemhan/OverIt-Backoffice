import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icons";

/* Page title + actions. The Tracking filter bar goes right below it, as a sibling. */
export function PageHeader({
  title,
  sub,
  actions,
  back,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: { label: string; href: string };
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 -ml-2 inline-flex h-[30px] press items-center gap-1 rounded-[9px] px-2 text-[13.5px] font-bold text-ink-60 hover:bg-ink/5 hover:text-ink"
          >
            <Icon.back size={16} />
            {back.label}
          </Link>
        )}
        <h1 className="text-[26px] leading-[1.12] font-black tracking-[-0.025em] text-balance text-ink sm:text-[30px]">
          {title}
        </h1>
        {sub && <p className="mt-1.5 max-w-[70ch] text-[14px] leading-[1.5] font-medium text-ink-60">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
