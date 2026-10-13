"use client";

import { useDebounced } from "@/lib/useDebounced";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { HScroll } from "@/components/ui/HScroll";
import { Panel } from "@/components/ui/Card";
import { MirrorColumns, SERIES, Stack100, WithTable } from "@/components/ui/charts";
import { Pager } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Figure, StatTile, type FigureId } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { cx } from "@/lib/cx";
import { useTrackeoFilters } from "@/lib/filters";
import { ago, dayLong, dayShort, n, p, plural } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries";
import type { ToneId } from "@/lib/tones";
import { dayKey, money, ts } from "@/lib/trackeo/labels";
import { useSubscriptionsMetrics, useUsers } from "@/lib/trackeo/queries";
import type { SubscriptionFilter, UserListItem } from "@/lib/trackeo/types";
import { ErrorPanel, NotMeasured, SubBadge, UserCell } from "../_ui";

/*
 * Trackeo → Suscripciones. The state of every subscription TODAY (does not follow the period): who renews (and who
 * renews this week), who canceled (and still has access) and who no longer has access. New/canceled per day and the
 * cancellation messages follow the period. Lists come from GET /users?subscription=<bucket>&sort=expiresAt.
 */

type View = Exclude<SubscriptionFilter, "none">;
const VIEWS: View[] = ["renews", "renewsThisWeek", "canceledWithAccess", "canceled", "expired", "grant"];

const VIEW_COPY: Record<View, { title: string; sub: string; desc: boolean }> = {
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

export function Suscripciones() {
  const { filters } = useTrackeoFilters();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const m = useSubscriptionsMetrics(filters.range);
  const d = m.data;

  const asked = params.get("ver") as View | null;
  const view: View = asked && VIEWS.includes(asked) ? asked : "renews";
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [page, setPage] = useState(1);

  const show = (v: View) => {
    const next = new URLSearchParams(params);
    next.set("ver", v);
    router.replace(`${pathname}?${next}`, { scroll: false });
    setPage(1);
  };

  const list = useUsers(
    { search, onboarding: null, subscription: view },
    { page, pageSize: DEFAULT_PAGE_SIZE, sort: { key: "expiresAt", desc: VIEW_COPY[view].desc } },
  );

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
  const count: Record<View, number> = {
    renews: c.renews,
    renewsThisWeek: c.renewsThisWeek,
    canceledWithAccess: c.canceledWithAccess,
    canceled: c.canceled,
    expired: c.expired,
    grant: c.activeGrants,
  };
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
            value={<Num value={count[t.id]} />}
            note={t.note}
            selected={view === t.id}
            onClick={() => {
              show(t.id);
              document.getElementById("lista-subs")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          title="Por qué cancelan"
          sub={plural(d.cancelReasons.total, "mensaje en el período", "mensajes en el período")}
          info="Lo que escribieron en el formulario de cancelación de la app. No está ligado a una suscripción puntual."
        >
          {d.cancelReasons.recent.length ? (
            <ul className="space-y-2">
              {d.cancelReasons.recent.map((r) => (
                <li
                  key={r.feedbackId}
                  className="rounded-[12px] bg-bo-soft px-3.5 py-2.5 shadow-[inset_0_0_0_1px_#EFEDE7]"
                >
                  <p className="text-[13.5px] font-medium break-words text-ink">“{r.message}”</p>
                  <p className="mt-1 text-[12px] font-medium text-ink-60">
                    {dayLong(ts(r.at))}
                    {r.userId && (
                      <>
                        {" · "}
                        <Link href={`/trackeo/usuarios/${r.userId}`} className="font-bold text-purple hover:underline">
                          Ver usuario
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Nadie dejó un motivo en este período" icon={<Icon.check size={22} />} />
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
        id="lista-subs"
        className="mt-5 scroll-mt-28 lg:scroll-mt-6"
        pad={false}
        title={VIEW_COPY[view].title}
        sub={VIEW_COPY[view].sub}
      >
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-4">
          <HScroll label="Listas" arrows={false} className="max-w-full min-w-0" innerClassName="no-scrollbar">
            <div className="flex w-max gap-1.5">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => show(v)}
                  aria-pressed={view === v}
                  className={cx(
                    "h-[34px] shrink-0 press rounded-full px-3.5 text-[13.5px] font-bold",
                    view === v ? "bg-ink text-white" : "bg-[#F0EEE9] text-ink-70 hover:text-ink",
                  )}
                >
                  {VIEW_COPY[v].title} <span className="tnum opacity-70">{n(count[v])}</span>
                </button>
              ))}
            </div>
          </HScroll>
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
        <SubList
          view={view}
          rows={list.data?.items}
          loading={list.isPending}
          error={list.isError ? list.error : null}
          search={q}
        />
        {list.data && (
          <Pager page={page} pageSize={list.data.pageSize} totalCount={list.data.totalCount} onPage={setPage} />
        )}
      </Panel>
    </>
  );
}

function SubList({
  view,
  rows,
  loading,
  error,
  search,
}: {
  view: View;
  rows: UserListItem[] | undefined;
  loading: boolean;
  error: unknown;
  search: string;
}) {
  const [now] = useState(() => Date.now());
  if (error)
    return (
      <div className="border-t border-bo-line">
        <EmptyState compact icon={<Icon.alert size={22} />} title="No pudimos cargar la lista" />
      </div>
    );
  if (loading || !rows)
    return (
      <div className="space-y-2 border-t border-bo-line p-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[44px] rounded-[12px]" />
        ))}
      </div>
    );
  if (!rows.length)
    return (
      <div className="border-t border-bo-line">
        <EmptyState
          compact
          title={search ? "Nadie coincide con la búsqueda" : "No hay nadie en esta lista"}
          text={search ? "Probá con otro nombre, email o ID." : undefined}
        />
      </div>
    );
  return (
    <ul className="divide-y divide-bo-line border-t border-bo-line">
      {rows.map((u) => {
        const s = u.subscription;
        const exp = s.expiresAt ? ts(s.expiresAt) : null;
        const key =
          view === "grant"
            ? "Acceso de cortesía"
            : !exp
              ? "Sin fecha"
              : view === "renews" || view === "renewsThisWeek"
                ? `Renueva el ${dayLong(exp)}`
                : view === "canceledWithAccess"
                  ? `Acceso hasta el ${dayLong(exp)}`
                  : `Venció el ${dayLong(exp)}`;
        return (
          <li key={u.id}>
            <Link
              href={`/trackeo/usuarios/${u.id}?tab=suscripcion`}
              className="grid gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-bo-soft md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center"
            >
              <UserCell u={u} />
              <span className="text-[13px] font-medium text-ink-70">
                <span className="block font-bold text-ink">{s.productId ?? "—"}</span>
                {s.store ?? ""}
              </span>
              <span className="min-w-0 text-[13px] font-medium text-ink-70">
                <span className="block font-bold text-ink">{key}</span>
                {exp && <span className="block">{exp > now ? null : ago(exp, now)}</span>}
              </span>
              <span className="md:text-right">
                <SubBadge size="sm" bucket={s.bucket} expiresAt={s.expiresAt} grant={u.hasActiveGrant} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
