import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";

/* A pulsing placeholder block. Size it with classes (h-*, w-*, rounded-*). */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cx("skeleton", className)} style={style} />;
}

/* Whole-page placeholder with the same rhythm as a real page: title, filters, four KPI tiles and two panels. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="fade-in">
      <Skeleton className="h-[34px] w-[220px]" />
      <Skeleton className="mt-3 h-[16px] w-[min(460px,80%)]" />
      <Skeleton className="mt-6 h-[40px] w-[min(560px,100%)] rounded-[14px]" />
      <div className="mt-6 grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[136px] rounded-[20px]" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[340px] rounded-[20px]" />
        <Skeleton className="h-[340px] rounded-[20px]" style={{ animationDelay: "120ms" }} />
      </div>
    </div>
  );
}
