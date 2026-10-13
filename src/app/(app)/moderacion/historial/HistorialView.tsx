"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { dayLong, time } from "@/lib/format";
import { useAudit } from "@/lib/moderacion/queries";
import type { AuditEntry } from "@/lib/moderacion/types";
import { displayName, Pager, useDebounced } from "../_shared/ui";

/* Moderación → Historial. Every team action (moderation and content) from the server audit log, grouped by day. */

const PAGE_SIZE = 50;

export function HistorialView() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const audit = useAudit({ search, page, pageSize: PAGE_SIZE });

  const groups = useMemo(() => {
    const out: { day: string; items: AuditEntry[] }[] = [];
    for (const e of audit.data?.items ?? []) {
      const day = dayLong(Date.parse(e.at));
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [audit.data]);

  return (
    <>
      <PageHeader
        title="Historial"
        sub="Cada acción de moderación y de contenido, con quién la hizo y cuándo."
        actions={
          <SearchField
            label="Buscar en el historial"
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Buscar acción, ID o email"
            className="w-full sm:w-[280px]"
          />
        }
      />
      {audit.isPending ? (
        <div className="space-y-5" aria-busy="true" aria-label="Cargando">
          <Skeleton className="h-[260px] rounded-[20px]" />
          <Skeleton className="h-[180px] rounded-[20px]" />
        </div>
      ) : audit.isError ? (
        <Panel>
          <EmptyState
            icon={<Icon.alert size={22} />}
            title="No pudimos cargar el historial"
            text={describeError(audit.error)}
            action={<Button onClick={() => audit.refetch()}>Reintentar</Button>}
          />
        </Panel>
      ) : groups.length ? (
        <>
          <div className={cx("space-y-5 transition-opacity", audit.isPlaceholderData && "opacity-60")}>
            {groups.map((g) => (
              <Panel key={g.day} title={g.day} pad={false}>
                <ol className="divide-y divide-bo-line px-5 pb-2">
                  {g.items.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 w-[44px] shrink-0 text-[12.5px] font-bold text-ink-60 tnum">
                        {time(Date.parse(e.at))}
                      </span>
                      <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-purple-10 text-purple">
                        <Icon.history size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] leading-[1.45] font-medium text-ink">
                          <b className="font-bold">{displayName(e.admin)}</b> · {e.summary}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-60">
                          {e.action}
                          {e.targetId ? ` · ${e.targetId}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            ))}
          </div>
          <Pager
            page={page}
            totalPages={audit.data.totalPages}
            totalCount={audit.data.totalCount}
            onPage={setPage}
            busy={audit.isFetching}
          />
        </>
      ) : (
        <Panel>
          <EmptyState
            icon={<Icon.history size={22} />}
            title={search ? "Nada coincide con la búsqueda" : "Todavía no hay acciones"}
            text={
              search
                ? "Probá con otra palabra."
                : "Cuando elimines algo, cambies un nombre, resuelvas un reporte o edites contenido, queda registrado acá."
            }
          />
        </Panel>
      )}
    </>
  );
}
