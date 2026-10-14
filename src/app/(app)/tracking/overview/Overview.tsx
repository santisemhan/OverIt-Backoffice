"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { PhoneShot } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { BarList, DotMap, RampLegend, SERIES, TimeChart, WithTable } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { cx } from "@/lib/cx";
import { countryName, filtersQuery, langName, useTrackingFilters } from "@/lib/filters";
import { dayShort, n, p, plural } from "@/lib/format";
import {
  AGE_LABEL,
  dayKey,
  GENDER_LABEL,
  MAP_ID,
  mergeAnswers,
  money,
  pct,
  questionLabel,
} from "@/lib/tracking/labels";
import { funnelRows, shot, STEPS } from "@/lib/tracking/onboarding";
import { useOnboardingFunnel, useOverview } from "@/lib/tracking/queries";
import type { Overview as OverviewData } from "@/lib/tracking/types";
import { ErrorPanel } from "../_ui";

/*
 * Tracking → Overview. The conversion path for the people who signed up in the period, how it evolves, revenue,
 * who they are (sex, age, language, countries), their most common onboarding profile and where people leave the
 * onboarding. Country and language filter the cohort; revenue and subscriptions stay global.
 */
export function Overview() {
  const { filters } = useTrackingFilters();
  const params = useSearchParams();
  const router = useRouter();
  const q = useOverview(filters);
  const d = q.data;
  const onb = useOnboardingFunnel(filters);
  const exits = useMemo(
    () =>
      onb.data
        ? funnelRows(onb.data)
            .rows.filter((r) => r.step.id !== "paywall" && r.left > 0)
            .sort((a, b) => b.left - a.left)
            .slice(0, 3)
        : [],
    [onb.data],
  );

  const series = useMemo(
    () =>
      d
        ? [
            {
              id: "downloads",
              label: "Registros",
              color: SERIES[0],
              points: d.perDay.map((x) => ({ t: dayKey(x.date), v: x.downloads })),
            },
            {
              id: "subscribed",
              label: "Primera compra",
              color: SERIES[1],
              points: d.perDay.map((x) => ({ t: dayKey(x.date), v: x.subscribed })),
            },
          ]
        : [],
    [d],
  );

  const profile = useMemo(() => (d ? mergeAnswers(d.onboardingAnswers) : []), [d]);

  const toScreen = (screen: string) => {
    const next = new URLSearchParams(filtersQuery(params));
    next.set("screen", screen);
    router.push(`/tracking/onboarding?${next}`);
  };

  return (
    <>
      <PageHeader title="Resumen" sub="Cuántos llegan, cuántos pagan y quiénes son." />
      <FilterBar />
      {q.isError && !d ? (
        <ErrorPanel error={q.error} onRetry={() => void q.refetch()} />
      ) : !d ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4 @min-[58rem]:gap-5">
            <StatTile
              tone="violet"
              figure="circles"
              icon={<Icon.users size={15} />}
              label="Se registraron"
              value={<Num value={d.funnel.downloads} />}
              note="cuentas creadas en el período"
            />
            <StatTile
              tone="lilac"
              figure="halves"
              icon={<Icon.check size={15} />}
              label="Completaron el onboarding"
              value={<Num value={d.funnel.onboardingCompleted} />}
              note={`${p(pct(d.funnel.onboardingCompleted, d.funnel.downloads))} de los registrados`}
            />
            <StatTile
              tone="lime"
              figure="leaves"
              icon={<Icon.card size={15} />}
              label="Se suscribieron"
              value={<Num value={d.funnel.subscribed} />}
              note={`${p(pct(d.funnel.subscribed, d.funnel.downloads))} de los registrados`}
            />
            <StatTile
              tone="mint"
              figure="rings"
              icon={<Icon.lock size={15} />}
              label="Con acceso hoy"
              value={<Num value={d.funnel.withAccessToday} />}
              note="suscripción activa o cortesía"
            />
          </div>

          <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-3">
            <Panel title="Evolución" info="Registros y primeras compras por día (UTC)." className="lg:col-span-2">
              {d.perDay.length ? (
                <WithTable
                  label="Registros y primeras compras por día"
                  table={{
                    cols: ["Día", "Registros", "Primera compra"],
                    rows: d.perDay.map((x) => [dayShort(dayKey(x.date)), x.downloads, x.subscribed]),
                  }}
                >
                  <TimeChart series={series} />
                </WithTable>
              ) : (
                <EmptyState compact title="Sin datos en este período" />
              )}
            </Panel>
            <Panel
              tone="mint"
              title="Ingreso mensual"
              info="Lo que suman por mes las suscripciones que renuevan, según el último cobro de cada una (en USD, estimado por RevenueCat). Cobrado: pagos del período, sin reintegros ni pruebas (sandbox). No se filtra por país ni idioma."
            >
              {d.mrrEstimate ? (
                <>
                  <p className="text-[36px] leading-none font-black tracking-[-0.035em] text-[#1F4A1A]">
                    {money(d.mrrEstimate.amount, d.mrrEstimate.currency)}
                  </p>
                  <p className="mt-1.5 text-[12.5px] font-medium text-[#2F6B28]">
                    {money(d.mrrEstimate.netAmount, d.mrrEstimate.currency)} después de impuestos y comisiones
                  </p>
                </>
              ) : (
                <p className="text-[14px] font-bold text-[#2F6B28]">Ninguna suscripción renueva todavía.</p>
              )}
              <dl className="mt-5 space-y-2 rounded-[14px] bg-white/70 p-3.5 text-[13.5px] font-medium text-[#1F4A1A]">
                <Row label="Cobrado en el período" value={money(d.collected.grossUsd, "USD")} />
                <Row label="Neto (sin impuestos ni comisiones)" value={money(d.collected.netUsd, "USD")} />
                <Row label="Cobros" value={n(d.collected.payments)} />
                {d.collected.refunds > 0 && (
                  <Row
                    label="Reintegrados"
                    value={`${n(d.collected.refunds)} · ${money(d.collected.refundedUsd, "USD")}`}
                  />
                )}
              </dl>
              <dl className="mt-3 space-y-2 rounded-[14px] bg-white/70 p-3.5 text-[13.5px] font-medium text-[#1F4A1A]">
                <Row label="Suscripciones activas" value={n(d.subscriptions.active)} />
                <Row label="Renuevan" value={n(d.subscriptions.renewing)} />
                <Row label="Cancelaron, con acceso" value={n(d.subscriptions.canceledWithAccess)} />
              </dl>
              <Link
                href="/tracking/subscriptions"
                className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#2F6B28] hover:underline"
              >
                Ver suscripciones <Icon.arrowRight size={14} />
              </Link>
            </Panel>
          </div>

          <SectionTitle
            tone="lilac"
            icon={<Icon.users size={18} />}
            title="Quiénes son"
            sub="Registrados en el período."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Sexo">
              <BarList
                rows={d.breakdowns.gender.map((g) => ({
                  key: g.key,
                  label: GENDER_LABEL[g.key] ?? g.key,
                  value: g.users,
                  pct: pct(g.users, d.funnel.downloads),
                  hint: `${n(g.subscribed)} ${g.subscribed === 1 ? "se suscribió" : "se suscribieron"}`,
                }))}
              />
            </Panel>
            <Panel title="Edad">
              <BarList
                color={SERIES[2]}
                rows={d.breakdowns.age.map((g) => ({
                  key: g.key,
                  label: AGE_LABEL[g.key] ?? g.key,
                  value: g.users,
                  pct: pct(g.users, d.funnel.downloads),
                  hint: `${n(g.subscribed)} ${g.subscribed === 1 ? "se suscribió" : "se suscribieron"}`,
                }))}
              />
            </Panel>
            <Panel title="Idioma" info="El idioma de la app de cada persona.">
              {d.breakdowns.language.length ? (
                <BarList
                  color={SERIES[1]}
                  rows={d.breakdowns.language.map((g) => ({
                    key: g.key,
                    label: g.key === "UNKNOWN" ? "Sin dato" : langName(g.key),
                    value: g.users,
                    pct: pct(g.users, d.funnel.downloads),
                    hint: `${n(g.subscribed)} ${g.subscribed === 1 ? "se suscribió" : "se suscribieron"}`,
                  }))}
                />
              ) : (
                <EmptyState compact title="Sin datos en este período" />
              )}
            </Panel>
          </div>

          <Countries d={d} />

          <SectionTitle
            tone="peach"
            icon={<Icon.leaf size={18} />}
            title="Perfil más común"
            sub="La respuesta más elegida en cada pregunta del onboarding."
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel
              title="Respuestas"
              actions={
                <Link href="/tracking/onboarding" className="text-[13px] font-bold text-purple hover:underline">
                  Ver todo el onboarding
                </Link>
              }
            >
              {profile.length ? (
                <ul className="divide-y divide-bo-line">
                  {profile.map((qa) => {
                    const top = qa.options[0];
                    return (
                      <li key={qa.question} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0 text-[13px] font-medium text-ink-60">
                          {questionLabel(qa.question)}
                        </span>
                        <span className="shrink-0 text-right text-[13.5px] font-bold text-ink">
                          {top ? top.label : "—"}
                          {top && <span className="ml-1.5 text-ink-60 tnum">{p(pct(top.count, qa.answered))}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact title="Nadie respondió el onboarding en este período" />
              )}
            </Panel>
            <Panel
              title="Dónde se van"
              info="Las pantallas del onboarding donde más gente cerró la app."
              actions={
                <Link
                  href={`/tracking/onboarding${filtersQuery(params)}`}
                  className="text-[13px] font-bold text-purple hover:underline"
                >
                  Ver el embudo
                </Link>
              }
            >
              {onb.isError && !onb.data ? (
                <EmptyState
                  compact
                  icon={<Icon.alert size={22} />}
                  title="No pudimos cargar el embudo"
                  action={<Button onClick={() => void onb.refetch()}>Reintentar</Button>}
                />
              ) : !onb.data ? (
                <Skeleton className="h-[180px] rounded-[14px]" />
              ) : exits.length ? (
                <ul className="space-y-2.5">
                  {exits.map((r, i) => (
                    <li key={r.step.id}>
                      <button
                        type="button"
                        onClick={() => toScreen(r.step.id)}
                        className={cx(
                          "flex w-full press items-center gap-3.5 rounded-[14px] p-2 text-left",
                          i === 0 ? "bg-[#FEE9E0]" : "hover:bg-bo-soft",
                        )}
                      >
                        <PhoneShot src={shot(r.step.id)} alt={r.step.label} width={50} ring={i === 0 ? "bad" : null} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] leading-[1.3] font-bold text-ink">{r.step.label}</span>
                          <span className="mt-0.5 block text-[12.5px] font-medium text-ink-60">
                            Pantalla {r.i + 1} de {STEPS.length}
                          </span>
                          {i === 0 && (
                            <span className="mt-1.5 block">
                              <Badge size="sm" tone="bad">
                                Hacé foco acá
                              </Badge>
                            </span>
                          )}
                        </span>
                        <span className="text-right">
                          <span className="block text-[18px] font-black text-ink tnum">{n(r.left)}</span>
                          <span className="block text-[12px] font-bold text-bad tnum">{p(r.exitRate)} se fue</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<Icon.check size={22} />}
                  title="Nadie se fue todavía"
                  text="No hay abandonos en este período."
                />
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

/* Países: the dot map and the ranking. Picking a country filters every Tracking screen. */
function Countries({ d }: { d: OverviewData }) {
  const { filters, set } = useTrackingFilters();
  const [all, setAll] = useState(false);
  const cs = d.breakdowns.country.filter((c) => c.key !== "UNKNOWN");
  const unknown = d.breakdowns.country.find((c) => c.key === "UNKNOWN")?.users ?? 0;
  const onMap = cs.filter((c) => MAP_ID[c.key]);

  return (
    <>
      <SectionTitle
        tone="sky"
        icon={<Icon.globe size={18} />}
        title="Países"
        sub={
          filters.country === "all"
            ? "Tocá un país para filtrar todo el Trackeo."
            : `Filtrando por ${countryName(filters.country)}.`
        }
        actions={
          filters.country !== "all" && (
            <Button size="sm" variant="ghost" icon={<Icon.x size={14} />} onClick={() => set({ country: "all" })}>
              Quitar filtro
            </Button>
          )
        }
      />
      <Panel>
        {cs.length ? (
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <DotMap
                values={Object.fromEntries(onMap.map((c) => [MAP_ID[c.key], c.users]))}
                names={Object.fromEntries(onMap.map((c) => [MAP_ID[c.key], countryName(c.key)]))}
                selected={filters.country === "all" ? null : MAP_ID[filters.country]}
                onSelect={(id) => set({ country: onMap.find((c) => MAP_ID[c.key] === id)?.key ?? "all" })}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <RampLegend from="Menos" to="Más" />
                <span className="text-[12px] font-medium text-ink-60">
                  {`${plural(cs.length, "país", "países")}${unknown ? ` · ${n(unknown)} sin dato` : ""}`}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 grid grid-cols-[22px_minmax(0,1fr)_64px_56px] gap-3 px-2 text-[11.5px] font-bold tracking-[0.04em] text-ink-60 uppercase">
                <span>#</span>
                <span>País</span>
                <span className="text-right">Personas</span>
                <span className="text-right">Pagó</span>
              </div>
              <ol className="space-y-1">
                {(all ? cs : cs.slice(0, 8)).map((c, i) => {
                  const on = filters.country === c.key;
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ country: on ? "all" : c.key })}
                        className={cx(
                          "grid w-full press grid-cols-[22px_minmax(0,1fr)_64px_56px] items-center gap-3 rounded-[12px] px-2 py-2 text-left",
                          on ? "bg-purple-10" : "hover:bg-bo-soft",
                        )}
                      >
                        <span
                          className={cx(
                            "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11.5px] font-black tnum",
                            i < 3 ? "bg-[#E3F2FB] text-[#17496B]" : "text-ink-60",
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="flex h-[20px] w-[28px] shrink-0 items-center justify-center rounded-[6px] bg-[#F0EEE9] text-[10.5px] font-black text-ink-70">
                              {c.key}
                            </span>
                            <span className="truncate text-[14px] font-bold text-ink">{countryName(c.key)}</span>
                          </span>
                          <span className="mt-1.5 block h-[6px] overflow-hidden rounded-full bg-[#F1EFEA]">
                            <span
                              className="block h-full rounded-full bg-[#22628F]"
                              style={{ width: `${pct(c.users, cs[0].users)}%` }}
                            />
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[14px] font-black text-ink tnum">{n(c.users)}</span>
                          <span className="block text-[11.5px] font-medium text-ink-60 tnum">
                            {p(pct(c.users, d.funnel.downloads))}
                          </span>
                        </span>
                        <span className="text-right text-[13px] font-bold text-ink tnum">
                          {p(pct(c.subscribed, c.users))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {cs.length > 8 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  icon={<Icon.chevronDown size={15} className={cx("transition-transform", all && "rotate-180")} />}
                  onClick={() => setAll((v) => !v)}
                >
                  {all ? "Ver menos" : `Ver los ${cs.length} países`}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <EmptyState compact title="Sin datos en este período" />
        )}
      </Panel>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-black tnum">{value}</dd>
    </div>
  );
}
