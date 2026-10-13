"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { Panel } from "@/components/ui/Card";
import { BarList, SERIES, TimeChart, WithTable } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { useTrackeoFilters } from "@/lib/filters";
import { dayShort, n, p } from "@/lib/format";
import { AGE_LABEL, dayKey, GENDER_LABEL, money, pct, questionLabel, sortQuestions } from "@/lib/trackeo/labels";
import { useOverview } from "@/lib/trackeo/queries";
import { ErrorPanel, NotMeasured } from "../_ui";

/*
 * Trackeo → Resumen. The conversion path for the people who signed up in the period, how it evolves, revenue,
 * who they are and their most common onboarding profile. Country, language and per-screen drop-off are not stored
 * by the backend: those blocks say so instead of inventing numbers.
 */
export function Resumen() {
  const { filters } = useTrackeoFilters();
  const q = useOverview(filters.range);
  const d = q.data;

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

  return (
    <>
      <PageHeader title="Resumen" sub="Cuántos llegan, cuántos pagan y quiénes son." />
      <FilterBar country={false} lang={false} />
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
          <p className="mt-3 text-[12.5px] font-medium text-ink-60">
            No hay un evento de instalación: “registrados” son las cuentas creadas (el registro es al final del
            onboarding).
          </p>

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
              info="Lo que suman por mes las suscripciones que renuevan, según el último cobro de cada una (en USD, estimado por RevenueCat). Cobrado: pagos del período, sin reintegros ni pruebas (sandbox)."
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
                href="/trackeo/suscripciones"
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
            <div className="grid gap-5">
              <Panel title="Idioma">
                <NotMeasured text="La app no nos manda el idioma de cada persona." />
              </Panel>
              <Panel title="Países">
                <NotMeasured text="La app no nos manda el país de cada persona." />
              </Panel>
            </div>
          </div>

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
                <Link href="/trackeo/onboarding" className="text-[13px] font-bold text-purple hover:underline">
                  Ver todo el onboarding
                </Link>
              }
            >
              {d.onboardingAnswers.length ? (
                <ul className="divide-y divide-bo-line">
                  {sortQuestions(d.onboardingAnswers).map((qa) => {
                    const top = [...qa.options].sort((a, b) => b.count - a.count)[0];
                    return (
                      <li key={qa.question} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0 text-[13px] font-medium text-ink-60">
                          {questionLabel(qa.question)}
                        </span>
                        <span className="shrink-0 text-right text-[13.5px] font-bold text-ink">
                          {top ? top.answer : "—"}
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
            <Panel title="Dónde se van" info="Las pantallas del onboarding donde más gente cierra la app.">
              <NotMeasured text="La app solo manda las respuestas al final del onboarding; no registra cada pantalla." />
            </Panel>
          </div>
        </>
      )}
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
