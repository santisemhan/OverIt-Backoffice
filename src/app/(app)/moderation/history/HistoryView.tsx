"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { dayLong, time } from "@/lib/format";
import { useAudit } from "@/lib/moderation/queries";
import type { AuditEntry } from "@/lib/moderation/types";
import { displayName, useDebounced } from "../_shared/ui";

/* Moderation → History. Every team action (moderation and content) from the server audit log, newest first by default. */

const PAGE_SIZE = 50;

const COLUMNS: Column<AuditEntry>[] = [
  {
    key: "at",
    header: "Cuándo",
    sortable: true,
    cell: (e) => (
      <span className="whitespace-nowrap">
        <span className="block font-bold text-ink">{dayLong(Date.parse(e.at))}</span>
        <span className="tnum">{time(Date.parse(e.at))}</span>
      </span>
    ),
  },
  {
    key: "admin",
    header: "Quién",
    sortable: true,
    cell: (e) => <span className="font-bold whitespace-nowrap text-ink">{displayName(e.admin)}</span>,
  },
  {
    key: "summary",
    header: "Qué hizo",
    sortable: true,
    cell: (e) => <span className="block text-[14px] leading-[1.45] text-ink">{e.summary}</span>,
  },
  {
    key: "action",
    header: "Acción",
    sortable: true,
    cell: (e) => (
      <span className="block max-w-[260px] truncate font-mono text-[11.5px] text-ink-60">
        {e.action}
        {e.targetId ? ` · ${e.targetId}` : ""}
      </span>
    ),
  },
];

export function HistoryView() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "at", desc: true });
  const search = useDebounced(q);
  const audit = useAudit({ search, page, pageSize: PAGE_SIZE, sort });

  return (
    <>
      <PageHeader
        title="Historial"
        sub="Cada acción de moderación, con quién la hizo y cuándo."
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
      {audit.isError && !audit.data ? (
        <Panel>
          <EmptyState
            icon={<Icon.alert size={22} />}
            title="No pudimos cargar el historial"
            text={describeError(audit.error)}
            action={<Button onClick={() => audit.refetch()}>Reintentar</Button>}
          />
        </Panel>
      ) : (
        <Panel pad={false}>
          <DataTable
            label="Historial"
            columns={COLUMNS}
            rows={audit.data?.items ?? []}
            rowKey={(e) => e.id}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            loading={audit.isPending || audit.isPlaceholderData}
            empty={
              <EmptyState
                icon={<Icon.history size={22} />}
                title={search ? "Nada coincide con la búsqueda" : "Todavía no hay acciones"}
                text={
                  search
                    ? "Probá con otra palabra."
                    : "Cuando elimines algo, cambies un nombre o resuelvas un reporte, queda registrado acá."
                }
              />
            }
            pagination={
              audit.data && {
                page,
                pageSize: audit.data.pageSize,
                totalCount: audit.data.totalCount,
                onPage: setPage,
              }
            }
          />
        </Panel>
      )}
    </>
  );
}
