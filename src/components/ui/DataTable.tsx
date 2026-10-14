"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { n } from "@/lib/format";
import { Button } from "./Button";
import { HScroll } from "./HScroll";
import { Skeleton } from "./Skeleton";
import { Icon } from "./icons";

/*
 * Table for server-paged lists. Controlled: sorting and paging are the server's job (the client only holds one page,
 * so sorting it locally would lie about what is at the top). Scrolls sideways when it does not fit, the first column
 * can stay pinned, and the header sticks when `maxHeight` turns the table into its own vertical scroll area.
 */

export type SortState = { key: string; desc: boolean };

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Shows the sort control; the key sent to the server is `key`. */
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
};

const STICKY =
  "sticky left-0 transition-shadow duration-200 group-data-[l=true]/hs:shadow-[8px_0_10px_-8px_rgba(36,35,35,0.22)]";

export const ariaSort = (sort: SortState | null | undefined, key: string) =>
  sort?.key === key ? (sort.desc ? "descending" : "ascending") : undefined;

/* Header control shared by every sortable table: a new column starts descending, the same column flips. */
export function SortButton({
  sortKey,
  sort,
  onSort,
  children,
}: {
  sortKey: string;
  sort: SortState | null | undefined;
  onSort: (sort: SortState) => void;
  children: ReactNode;
}) {
  const active = sort?.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort({ key: sortKey, desc: active ? !sort!.desc : true })}
      className={cx("inline-flex press items-center gap-1 rounded-[6px] hover:text-ink", active && "text-ink")}
    >
      {children}
      {!active ? (
        <Icon.sort size={13} className="opacity-50" />
      ) : sort!.desc ? (
        <Icon.down size={13} strokeWidth={2.4} />
      ) : (
        <Icon.up size={13} strokeWidth={2.4} />
      )}
    </button>
  );
}

/* Only for lists the client already holds whole (a profile's challenges, say); paged lists sort on the server. */
export function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  by: Record<string, (row: T) => string | number | null>,
): T[] {
  const get = sort && by[sort.key];
  if (!get) return rows;
  const dir = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (typeof x === "string" && typeof y === "string" ? x.localeCompare(y, "es") : x < y ? -1 : 1) * dir;
  });
}

export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  onRowClick,
  loading = false,
  empty,
  stickyFirstColumn = false,
  minWidth = 720,
  maxHeight,
  pagination,
}: {
  /** Accessible name of the table region. */
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState | null;
  onSort?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  /** Shows skeleton rows when there is nothing to show yet. */
  loading?: boolean;
  /** Rendered instead of the body when there are no rows (usually an <EmptyState />). */
  empty?: ReactNode;
  stickyFirstColumn?: boolean;
  minWidth?: number;
  /** Caps the height and makes the header sticky inside the table. */
  maxHeight?: number | string;
  pagination?: { page: number; pageSize: number; totalCount: number; onPage: (page: number) => void };
}) {
  const showSkeleton = loading && rows.length === 0;
  if (!showSkeleton && rows.length === 0 && empty) return <div className="border-t border-bo-line">{empty}</div>;

  return (
    <div>
      <HScroll label={label} arrowTop={5} arrowsRight={stickyFirstColumn} fadeLeft={!stickyFirstColumn}>
        <div className={maxHeight !== undefined ? "overflow-y-auto" : undefined} style={{ maxHeight }}>
          <table className="w-full text-left" style={{ minWidth }}>
            <thead>
              <tr className="text-[12.5px] text-ink-60">
                {columns.map((c, i) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={ariaSort(sort, c.key)}
                    className={cx(
                      "sticky top-0 z-[1] border-y border-bo-line bg-bo-soft px-3 py-3 font-bold whitespace-nowrap",
                      c.align === "right" && "text-right",
                      i === 0 && "pl-5",
                      i === columns.length - 1 && "pr-5",
                      i === 0 && stickyFirstColumn && cx(STICKY, "z-[2]"),
                      c.className,
                    )}
                  >
                    {c.sortable && onSort ? (
                      <SortButton sortKey={c.key} sort={sort} onSort={onSort}>
                        {c.header}
                      </SortButton>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              aria-busy={loading || undefined}
              className={cx(loading && !showSkeleton && "opacity-60 transition-opacity")}
            >
              {showSkeleton
                ? Array.from({ length: 6 }, (_, r) => (
                    <tr key={r} className="border-b border-bo-line last:border-0">
                      {columns.map((c, i) => (
                        <td
                          key={c.key}
                          className={cx("px-3 py-3.5", i === 0 && "pl-5", i === columns.length - 1 && "pr-5")}
                        >
                          <Skeleton
                            className="h-[14px] w-full max-w-[140px]"
                            style={{ animationDelay: `${r * 60}ms` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      onClick={
                        onRowClick
                          ? (e) => !(e.target as HTMLElement).closest("a, button") && onRowClick(row)
                          : undefined
                      }
                      className={cx(
                        "group/row border-b border-bo-line last:border-0",
                        onRowClick && "cursor-pointer hover:bg-bo-soft",
                      )}
                    >
                      {columns.map((c, i) => (
                        <td
                          key={c.key}
                          className={cx(
                            "px-3 py-2.5 text-[13px] font-medium text-ink-70",
                            c.align === "right" && "text-right tnum",
                            i === 0 && "pl-5",
                            i === columns.length - 1 && "pr-5",
                            i === 0 && stickyFirstColumn && cx(STICKY, "bg-white group-hover/row:bg-bo-soft"),
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </HScroll>
      {pagination && <Pager {...pagination} />}
    </div>
  );
}

/* Pager for 1-based server pages: "11–20 de 342" + Anterior / Siguiente. Hidden when everything fits in one page. */
export function Pager({
  page,
  pageSize,
  totalCount,
  onPage,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-bo-line px-4 py-3 sm:px-5">
      <span className="text-[13px] font-medium text-ink-60 tnum">
        {n((page - 1) * pageSize + 1)}–{n(Math.min(totalCount, page * pageSize))} de {n(totalCount)}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          icon={<Icon.back size={14} />}
        >
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="px-1.5 text-[13px] font-bold text-ink tnum">
          {page} / {pages}
        </span>
        <Button size="sm" aria-label="Página siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <span className="hidden sm:inline">Siguiente</span>
          <Icon.arrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
