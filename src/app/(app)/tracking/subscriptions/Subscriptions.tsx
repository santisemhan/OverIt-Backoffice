"use client";

import { useDebounced } from "@/lib/useDebounced";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { Panel } from "@/components/ui/Card";
import { MirrorColumns, SERIES, Stack100, WithTable } from "@/components/ui/charts";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Figure, StatTile, type FigureId } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { Num } from "@/components/ui/Stat";
import { useTrackingFilters } from "@/lib/filters";
import { ago, dayLong, dayShort, n, p, plural } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries";
import type { ToneId } from "@/lib/tones";
import { dayKey, money, ts } from "@/lib/tracking/labels";
import { useCancelReasons, useSubscriptionsMetrics, useUsers } from "@/lib/tracking/queries";
import type { CancelReason, SubscriptionFilter, UserListItem } from "@/lib/tracking/types";
import { ErrorPanel, NotMeasured, SubBadge, UserCell } from "../_ui";

/*
 * Tracking → Subscriptions. The state of every subscription TODAY (does not follow the period): who renews (and who
 * renews this week), who canceled (and still has access) and who no longer has access. New/canceled per day and the
 * cancellation messages follow the period. "Suscriptores" comes from GET /users?subscription=<filter>, by renewal date
 * unless a column header picks another order.
 */

type View = Exclude<SubscriptionFilter, "none">;
const VIEWS: View[] = [
  "any",
  "active",
  "renews",
  "renewsThisWeek",
  "canceledWithAccess",
  "canceled",
  "expired",
  "grant",
];

const REASONS_PAGE_SIZE = 10;

const VIEW_COPY: Record<View, { title: string; sub: string; desc: boolean }> = {
  any: { title: "Todas", sub: "Todos los que compraron alguna vez. Las cortesías están aparte.", desc: false },
  active: { title: "Activas", sub: "Con acceso pago hoy: renuevan o cancelaron pero siguen con acceso.", desc: false },
  renews: { title: "Renuevan", sub: "Ordenadas por la próxima renovación.", desc: false },
  renewsThisWeek: { title: "Renuevan esta semana", sub: "Se les cobra en los próximos 7 días.", desc: false },
  canceledWithAccess: {
    title: "Cancelaron, con acceso",
    sub: "Apagaron la renovación; tienen acceso hasta fin de período.",
    desc: false,
  },
  canceled: {
    title: "Cancelaron",
    sub: "Apagaron la renovación y ya no tienen acceso. Las más recientes primero.",
    desc: true,
  },
  expired: { title: "Vencidas", sub: "Se cortaron sin cancelar (un problema de cobro, por ejemplo).", desc: true },
  grant: { title: "Cortesía", sub: "Acceso regalado por el equipo.", desc: false },
};

export function Subscriptions() {
  const { filters } = useTrackingFilters();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const m = useSubscriptionsMetrics(filters.range);
  const d = m.data;

  const asked = params.get("view") as View | null;
  const view: View = asked && VIEWS.includes(asked) ? asked : "any";
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [reasonsPage, setReasonsPage] = useState({ range: filters.range, page: 1 });
  const [reasonsSort, setReasonsSort] = useState<SortState>({ key: "at", desc: true });
  const reasonsAt = reasonsPage.range === filters.range ? reasonsPage.page : 1;
  const reasons = useCancelReasons(filters.range, {
    page: reasonsAt,
    pageSize: REASONS_PAGE_SIZE,
    sort: reasonsSort,
  });

  const show = (v: View) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    router.replace(`${pathname}?${next}`, { scroll: false });
    setPage(1);
    setSort(null);
  };

  const listSort = sort ?? { key: "expiresAt", desc: VIEW_COPY[view].desc };
  const list = useUsers(
    { search, onboarding: null, subscription: view, launched: true },
    { page, pageSize: DEFAULT_PAGE_SIZE, sort: listSort },
  );
  const [now] = useState(() => Date.now());

  if (m.isError && !d)
    return (
      <>
        <PageHeader title="Suscripciones" sub="Quién renueva, quién canceló y por qué." />
        <ErrorPanel error={m.error} onRetry={() => void m.refetch()} />
      </>
    );
  if (!d)
    return (
      <>
        <PageHeader title="Suscripciones" sub="Quién renueva, quién canceló y por qué." />
        <PageSkeleton />
      </>
    );

  const c = d.counts;
  const count: Partial<Record<View, number>> = {
    any: c.total,
    active: c.renews + c.canceledWithAccess,
    renews: c.renews,
    renewsThisWeek: c.renewsThisWeek,
    canceledWithAccess: c.canceledWithAccess,
    canceled: c.canceled,
    expired: c.expired,
    grant: c.activeGrants,
  };
  const columns: Column<UserListItem>[] = [
    { key: "name", header: "Suscriptor", sortable: true, cell: (u) => <UserCell u={u} /> },
    {
      key: "product",
      header: "Producto",
      sortable: true,
      cell: (u) => (
        <span>
          <span className="block font-bold text-ink">{u.subscription.productId ?? "—"}</span>
          {u.subscription.store ?? ""}
        </span>
      ),
    },
    {
      key: "subscribedAt",
      header: "Se suscribió",
      sortable: true,
      cell: (u) => (
        <span className="tnum">{u.subscription.subscribedAt ? dayLong(ts(u.subscription.subscribedAt)) : "—"}</span>
      ),
    },
    {
      key: "expiresAt",
      header: "Renueva o vence",
      sortable: true,
      cell: (u) => {
        const s = u.subscription;
        const exp = s.expiresAt ? ts(s.expiresAt) : null;
        if (!exp) return u.hasActiveGrant ? "Acceso de cortesía" : "Sin fecha";
        return (
          <span>
            <span className="block font-bold text-ink">
              {s.bucket === "renews"
                ? `Renueva el ${dayLong(exp)}`
                : s.bucket === "canceledWithAccess"
                  ? `Acceso hasta el ${dayLong(exp)}`
                  : `Venció el ${dayLong(exp)}`}
            </span>
            {exp <= now && ago(exp, now)}
          </span>
        );
      },
    },
    {
      key: "subscription",
      header: "Estado",
      sortable: true,
      align: "right",
      cell: (u) => (
        <SubBadge
          size="sm"
          bucket={u.subscription.bucket}
          expiresAt={u.subscription.expiresAt}
          grant={u.hasActiveGrant}
        />
      ),
    },
  ];

  const reasonColumns: Column<CancelReason>[] = [
    {
      key: "message",
      header: "Mensaje",
      sortable: true,
      cell: (r) => <span className="block font-medium break-words text-ink">“{r.message}”</span>,
    },
    {
      key: "at",
      header: "Fecha",
      sortable: true,
      cell: (r) => <span className="whitespace-nowrap">{dayLong(ts(r.at))}</span>,
    },
    {
      key: "user",
      header: "Usuario",
      align: "right",
      cell: (r) =>
        r.userId ? (
          <Link
            href={`/tracking/users/${r.userId}`}
            className="font-bold whitespace-nowrap text-purple hover:underline"
          >
            Ver usuario
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  const tiles: { id: View; label: string; note: string; tone: ToneId; figure: FigureId; icon: ReactNode }[] = [
    {
      id: "renews",
      label: "Renuevan",
      note: "renovación automática encendida",
      tone: "mint",
      figure: "leaves",
      icon: <Icon.check size={15} />,
    },
    {
      id: "renewsThisWeek",
      label: "Renuevan esta semana",
      note: "se cobran en los próximos 7 días",
      tone: "lilac",
      figure: "circles",
      icon: <Icon.calendar size={15} />,
    },
    {
      id: "canceledWithAccess",
      label: "Cancelaron",
      note: "todavía con acceso",
      tone: "peach",
      figure: "quarters",
      icon: <Icon.x size={15} />,
    },
    {
      id: "canceled",
      label: "Sin acceso",
      note: `${n(c.expired)} más vencidas sin cancelar`,
      tone: "sand",
      figure: "rings",
      icon: <Icon.lock size={15} />,
    },
  ];

  const up = d.perDay.map((x) => ({ t: dayKey(x.date), v: x.new }));
  const down = d.perDay.map((x) => ({ t: dayKey(x.date), v: x.canceled }));
  const fr = d.firstRenewal;
  const totalRenewing = d.byProduct.reduce((a, x) => a + x.renewing, 0);

  return (
    <>
      <PageHeader title="Suscripciones" sub="Quién renueva, quién canceló y por qué." />
      <FilterBar country={false} lang={false} />

      <div className="grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4 @min-[58rem]:gap-5">
        {tiles.map((t) => (
          <StatTile
            key={t.id}
            tone={t.tone}
            figure={t.figure}
            icon={t.icon}
            label={t.label}
            value={<Num value={count[t.id] ?? 0} />}
            note={t.note}
            selected={view === t.id}
            onClick={() => {
              show(t.id);
              document.getElementById("subscriptions-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ))}
      </div>
      <p className="mt-3 text-[12.5px] font-medium text-ink-60">
        Estos números son el estado de hoy; el período solo cambia los gráficos de abajo.
      </p>

      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-3">
        <Panel
          tone="mint"
          title="Ingreso mensual"
          info="Lo que renueva hoy, llevado a un mes con el último cobro de cada suscripción (USD estimado por RevenueCat; los precios cambian por país). Cobrado: pagos del período, sin reintegros ni sandbox."
          className="relative h-full overflow-hidden"
        >
          <Figure kind="leaves" color="#CDEAC2" w={130} h={100} />
          {d.mrrEstimate ? (
            <>
              <p className="relative text-[36px] leading-none font-black tracking-[-0.035em] text-[#1F4A1A]">
                {money(d.mrrEstimate.amount, d.mrrEstimate.currency)}
              </p>
              <p className="relative mt-1.5 text-[12.5px] font-medium text-[#2F6B28]">
                {money(d.mrrEstimate.netAmount, d.mrrEstimate.currency)} neto
                {d.mrrEstimate.unpriced > 0 &&
                  ` · ${plural(d.mrrEstimate.unpriced, "sin cobro registrado", "sin cobro registrado")}`}
              </p>
            </>
          ) : (
            <p className="relative text-[15px] font-bold text-[#1F4A1A]">Ninguna suscripción renueva todavía.</p>
          )}
          <p className="relative mt-2 text-[13px] font-medium text-[#2F6B28]">
            {plural(c.renews, "suscripción que renueva", "suscripciones que renuevan")}
          </p>
          <dl className="relative mt-4 space-y-1.5 rounded-[14px] bg-white/70 p-3.5 text-[13px] font-medium text-[#1F4A1A]">
            <div className="flex justify-between gap-3">
              <dt>Cobrado en el período</dt>
              <dd className="font-bold tnum">{money(d.collected.grossUsd, "USD")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Neto</dt>
              <dd className="font-bold tnum">{money(d.collected.netUsd, "USD")}</dd>
            </div>
            {d.collected.byCurrency.map((c) => (
              <div key={c.currency} className="flex justify-between gap-3 text-[12.5px] text-[#2F6B28]">
                <dt>{`${c.currency} · ${plural(c.payments, "cobro", "cobros")}`}</dt>
                <dd className="tnum">{money(c.amount, c.currency)}</dd>
              </div>
            ))}
            {d.collected.refunds > 0 && (
              <div className="flex justify-between gap-3 text-[12.5px] text-[#2F6B28]">
                <dt>{plural(d.collected.refunds, "reintegro", "reintegros")}</dt>
                <dd className="tnum">{money(d.collected.refundedUsd, "USD")}</dd>
              </div>
            )}
          </dl>
          {totalRenewing > 0 && (
            <div className="relative mt-4 rounded-[14px] bg-white/70 p-3.5">
              <Stack100
                parts={d.byProduct
                  .filter((x) => x.renewing > 0)
                  .map((x, i) => ({
                    key: x.productId,
                    label: x.productId,
                    value: x.renewing,
                    color: SERIES[i % SERIES.length],
                  }))}
              />
            </div>
          )}
        </Panel>
        <Panel
          title="Altas y cancelaciones"
          info="Por día, en el período elegido (UTC)."
          className="h-full lg:col-span-2"
        >
          {d.perDay.length ? (
            <WithTable
              label="Altas y cancelaciones por día"
              table={{
                cols: ["Día", "Nuevas", "Cancelaciones"],
                rows: d.perDay.map((x) => [dayShort(dayKey(x.date)), x.new, x.canceled]),
              }}
            >
              <MirrorColumns
                up={up}
                down={down}
                upLabel="Nuevas"
                downLabel="Cancelaciones"
                ariaLabel="Nuevas suscripciones y cancelaciones por día"
              />
            </WithTable>
          ) : (
            <EmptyState compact title="Sin movimientos en este período" />
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          pad={false}
          title="Por qué cancelan"
          sub={plural(d.cancelReasons.total, "mensaje en el período", "mensajes en el período")}
          info="Lo que escribieron en el formulario de cancelación de la app. No está ligado a una suscripción puntual."
        >
          {reasons.isError && !reasons.data ? (
            <div className="mt-4 border-t border-bo-line">
              <EmptyState compact icon={<Icon.alert size={22} />} title="No pudimos cargar los motivos" />
            </div>
          ) : (
            <div className="mt-4">
              <DataTable
                label="Por qué cancelan"
                columns={reasonColumns}
                rows={reasons.data?.items ?? []}
                rowKey={(r) => r.feedbackId}
                sort={reasonsSort}
                onSort={(s) => {
                  setReasonsSort(s);
                  setReasonsPage({ range: filters.range, page: 1 });
                }}
                loading={reasons.isPending}
                minWidth={520}
                empty={
                  <EmptyState compact title="Nadie dejó un motivo en este período" icon={<Icon.check size={22} />} />
                }
                pagination={
                  reasons.data && {
                    page: reasonsAt,
                    pageSize: reasons.data.pageSize,
                    totalCount: reasons.data.totalCount,
                    onPage: (next) => setReasonsPage({ range: filters.range, page: next }),
                  }
                }
              />
            </div>
          )}
        </Panel>
        <Panel
          title="Primera renovación"
          info="Aproximado: cuenta como renovada si el último cobro fue al menos 20 días después de la primera compra."
        >
          {fr.rate === null || fr.eligible === 0 ? (
            <NotMeasured title="Todavía no hay a quién medir" text="Nadie terminó su primer período pagado." />
          ) : (
            <>
              <p className="text-[38px] leading-none font-black tracking-[-0.035em] text-ink">{p(fr.rate * 100)}</p>
              <p className="mt-2 text-[13px] font-medium text-ink-70">
                {`renovó después del primer período (${n(fr.renewed)} de ${n(fr.eligible)}).`}
              </p>
              <div className="mt-5">
                <Stack100
                  parts={[
                    { key: "r", label: "Renovaron", value: fr.renewed, color: SERIES[0] },
                    { key: "c", label: "No renovaron", value: fr.eligible - fr.renewed, color: SERIES[1] },
                  ]}
                />
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel
        id="subscriptions-list"
        className="mt-5 scroll-mt-28 lg:scroll-mt-6"
        pad={false}
        title="Suscriptores"
        sub={VIEW_COPY[view].sub}
      >
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-4">
          <Select
            label="Suscripción"
            value={view}
            options={VIEWS.map((v) => ({
              id: v,
              label: VIEW_COPY[v].title,
              hint: count[v] === undefined ? undefined : n(count[v]),
            }))}
            onChange={show}
          />
          <SearchField
            label="Buscar en la lista"
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Nombre, email o ID"
            className="ml-auto w-full sm:w-[260px]"
          />
        </div>
        {list.isError && !list.data ? (
          <div className="border-t border-bo-line">
            <EmptyState compact icon={<Icon.alert size={22} />} title="No pudimos cargar la lista" />
          </div>
        ) : (
          <DataTable
            label="Suscriptores"
            columns={columns}
            rows={list.data?.items ?? []}
            rowKey={(u) => u.id}
            sort={listSort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            onRowClick={(u) => router.push(`/tracking/users/${u.id}?tab=subscription`)}
            loading={list.isPending}
            stickyFirstColumn
            empty={
              <EmptyState
                compact
                title={q ? "Nadie coincide con la búsqueda" : "No hay nadie en esta lista"}
                text={q ? "Probá con otro nombre, email o ID." : undefined}
              />
            }
            pagination={
              list.data && {
                page,
                pageSize: list.data.pageSize,
                totalCount: list.data.totalCount,
                onPage: setPage,
              }
            }
          />
        )}
      </Panel>
    </>
  );
}
