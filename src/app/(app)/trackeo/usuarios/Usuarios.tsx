"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { api, describeError } from "@/lib/api";
import { ago, dayShort, n } from "@/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/queries";
import { BUCKET_LABEL, GENDER_LABEL, STATUS_LABEL, ts } from "@/lib/trackeo/labels";
import { useUsers, usersQueryParams, type UserListFilters } from "@/lib/trackeo/queries";
import type { OnboardingFilter, Paged, SubscriptionFilter, UserListItem } from "@/lib/trackeo/types";
import { ErrorPanel, OnbBadge, SubBadge, UserCell } from "../_ui";

/*
 * Trackeo → Usuarios. Server-side search, filters, sort and paging. Filters live in the URL (?onboarding=…&
 * suscripcion=…) so other screens can link to a filtered list. "Descargar CSV" pages through the API with the
 * current filters and sort.
 */

type OnbOpt = OnboardingFilter | "all";
type SubOpt = SubscriptionFilter | "all";

const ONB_OPTIONS: SelectOption<OnbOpt>[] = [
  { id: "all", label: "Onboarding: todos" },
  { id: "completed", label: "Completó" },
  { id: "notCompleted", label: "No completó" },
  { id: "partial", label: "Le falta la segunda parte" },
  { id: "pending", label: "Sin onboarding" },
];
const SUB_OPTIONS: SelectOption<SubOpt>[] = [
  { id: "all", label: "Suscripción: todas" },
  { id: "renews", label: "Renueva" },
  { id: "renewsThisWeek", label: "Renueva esta semana" },
  { id: "canceledWithAccess", label: "Canceló, con acceso" },
  { id: "canceled", label: "Canceló" },
  { id: "expired", label: "Vencida" },
  { id: "grant", label: "Acceso de cortesía" },
  { id: "none", label: "Sin suscripción" },
];

const parse = <T extends string>(v: string | null, opts: SelectOption<T>[], dflt: T): T =>
  opts.some((o) => o.id === v) ? (v as T) : dflt;

export function Usuarios() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const onboarding = parse<OnbOpt>(params.get("onboarding"), ONB_OPTIONS, "all");
  const subscription = parse<SubOpt>(params.get("suscripcion"), SUB_OPTIONS, "all");
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const search = useDeferredValue(q);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [exporting, setExporting] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setPage(1);
  };

  const filters: UserListFilters = {
    search,
    onboarding: onboarding === "all" ? null : onboarding,
    subscription: subscription === "all" ? null : subscription,
  };
  const list = { page, pageSize, sort };
  const users = useUsers(filters, list);
  const filtered = !!(search.trim() || filters.onboarding || filters.subscription);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: UserListItem[] = [];
      for (let p = 1; ; p++) {
        const res = await api<Paged<UserListItem>>("/api/backoffice/users", {
          query: usersQueryParams(filters, { page: p, pageSize: 100, sort }),
        });
        rows.push(...res.items);
        if (p >= res.totalPages || res.items.length === 0) break;
      }
      downloadCsv(rows);
      toast({ text: `Descargaste ${n(rows.length)} ${rows.length === 1 ? "usuario" : "usuarios"}` });
    } catch (e) {
      toast({ text: describeError(e), tone: "bad" });
    } finally {
      setExporting(false);
    }
  };

  const [now] = useState(() => Date.now());
  const columns: Column<UserListItem>[] = [
    { key: "name", header: "Usuario", sortable: true, cell: (u) => <UserCell u={u} /> },
    { key: "onboarding", header: "Onboarding", cell: (u) => <OnbBadge status={u.status} size="sm" /> },
    {
      key: "expiresAt",
      header: "Suscripción",
      sortable: true,
      cell: (u) => (
        <SubBadge
          size="sm"
          bucket={u.subscription.bucket}
          expiresAt={u.subscription.expiresAt}
          grant={u.hasActiveGrant}
        />
      ),
    },
    {
      key: "age",
      header: "Edad",
      sortable: true,
      align: "right",
      cell: (u) => <span className="tnum">{u.age ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Alta",
      sortable: true,
      cell: (u) => <span className="text-ink-70 tnum">{u.createdAt ? dayShort(ts(u.createdAt)) : "—"}</span>,
    },
    {
      key: "lastLogin",
      header: "Última vez",
      sortable: true,
      cell: (u) => <span className="text-ink-70">{ago(ts(u.lastLogin), now)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        sub={users.data ? `${n(users.data.totalCount)} ${filtered ? "coinciden" : "en total"}` : "Todas las cuentas."}
        actions={
          <Button
            icon={<Icon.down size={16} />}
            loading={exporting}
            disabled={!users.data?.totalCount}
            onClick={() => void exportCsv()}
          >
            Descargar CSV
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField
          label="Buscar usuarios"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Nombre, email o ID"
          className="w-full sm:w-[300px]"
        />
        <Select
          label="Onboarding"
          value={onboarding}
          options={ONB_OPTIONS}
          onChange={(v) => setParam("onboarding", v)}
        />
        <Select
          label="Suscripción"
          value={subscription}
          options={SUB_OPTIONS}
          onChange={(v) => setParam("suscripcion", v)}
        />
        <Select
          label="Por página"
          className="ml-auto"
          value={String(pageSize)}
          options={PAGE_SIZE_OPTIONS.map((s) => ({ id: String(s), label: `${s} por página` }))}
          onChange={(v) => {
            setPageSize(Number(v));
            setPage(1);
          }}
        />
      </div>
      {users.isError && !users.data ? (
        <ErrorPanel error={users.error} onRetry={() => void users.refetch()} />
      ) : (
        <Panel pad={false}>
          <DataTable
            label="Usuarios"
            columns={columns}
            rows={users.data?.items ?? []}
            rowKey={(u) => u.id}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            onRowClick={(u) => router.push(`/trackeo/usuarios/${u.id}`)}
            loading={users.isPending}
            stickyFirstColumn
            empty={
              <EmptyState
                compact
                icon={<Icon.users size={22} />}
                title={filtered ? "Nadie coincide" : "Todavía no hay usuarios"}
                text={filtered ? "Probá con otra búsqueda o sacá algún filtro." : undefined}
              />
            }
            pagination={
              users.data && {
                page,
                pageSize: users.data.pageSize,
                totalCount: users.data.totalCount,
                onPage: setPage,
              }
            }
          />
        </Panel>
      )}
    </>
  );
}

/* ─────────── CSV ─────────── */

const cell = (v: string | number | boolean | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralize spreadsheet formulas and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

function downloadCsv(rows: UserListItem[]) {
  const head = [
    "id",
    "nombre",
    "email",
    "edad",
    "sexo",
    "onboarding",
    "suscripcion",
    "producto",
    "tienda",
    "vence",
    "renueva",
    "cortesia",
    "con_acceso",
    "alta",
    "ultima_vez",
    "dispositivo",
    "proveedores",
  ];
  const lines = rows.map((u) =>
    [
      u.id,
      u.name,
      u.email,
      u.age,
      u.gender ? GENDER_LABEL[u.gender] : "",
      STATUS_LABEL[u.status],
      BUCKET_LABEL[u.subscription.bucket],
      u.subscription.productId,
      u.subscription.store,
      u.subscription.expiresAt,
      u.subscription.willRenew ? "si" : "no",
      u.hasActiveGrant ? "si" : "no",
      u.hasAccess ? "si" : "no",
      u.createdAt,
      u.lastLogin,
      u.lastDevice,
      u.providers.join(" "),
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
