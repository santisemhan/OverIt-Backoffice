"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { Avatar, PhoneShot } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { Columns, DotMap, RampLegend, SERIES, TimeChart, TipRow, Waffle, WithTable } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { Figure, SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { IDS } from "@/components/ui/mapDots";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Segmented } from "@/components/ui/Tabs";
import { Num } from "@/components/ui/Stat";
import { cx } from "@/lib/cx";
import { countryName, filtersQuery, langName, useTrackingFilters } from "@/lib/filters";
import { dayShort, n, n1, p, plural } from "@/lib/format";
import { AGE_LABEL, dayKey, GENDER_LABEL, mergeAnswers, type MergedQuestion, money, pct } from "@/lib/tracking/labels";
import { funnelRows, shot, STEPS } from "@/lib/tracking/onboarding";
import { useOnboardingFunnel, useOverview } from "@/lib/tracking/queries";
import type { AgeKey, Overview as OverviewData } from "@/lib/tracking/types";
import { ErrorPanel } from "../_ui";

const MAP_IDS = new Set(IDS);

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
          <Per100 downloads={d.funnel.downloads} subscribed={d.funnel.subscribed} />

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

          <Who d={d} />

          <Countries d={d} />

          <SectionTitle tone="lime" icon={<Icon.star size={18} />} title="Para tener en cuenta" />
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <CommonProfile d={d} profile={profile} />
            <Panel
              title="Dónde se van"
              info="Las pantallas del onboarding donde más gente cerró la app."
              className="h-full"
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
  const onMap = cs.filter((c) => MAP_IDS.has(c.key));

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
                values={Object.fromEntries(onMap.map((c) => [c.key, c.users]))}
                names={Object.fromEntries(onMap.map((c) => [c.key, countryName(c.key)]))}
                selected={filters.country === "all" ? null : filters.country}
                onSelect={(id) => set({ country: id ?? "all" })}
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

/* "De cada 100 personas…": the whole funnel in one sentence. */
function Per100({ downloads, subscribed }: { downloads: number; subscribed: number }) {
  const v = downloads ? (subscribed / downloads) * 100 : 0;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)]">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-lime text-ink">
        <Icon.funnel size={17} />
      </span>
      <p className="text-[14.5px] font-medium text-ink-70">
        De cada <b className="font-black text-ink">100</b> personas que se registran en Over It,{" "}
        <b className="rounded-[8px] bg-lime px-1.5 py-px text-[16px] font-black text-ink tnum">
          {v >= 10 || v === 0 ? n(v) : n1(v)}
        </b>{" "}
        terminan pagando.
      </p>
    </div>
  );
}

const GENDER_COLOR: Record<string, string> = {
  FEMALE: SERIES[0],
  MALE: SERIES[1],
  NON_BINARY: SERIES[2],
  OTHER: "#8E8A82",
  PREFER_NOT_TO_SAY: "#B9B5AD",
};
const AGE_RANGE_LABEL: Record<string, string> = {
  "<18": "−18",
  "18-21": "18–21",
  "22-25": "22–25",
  "26-29": "26–29",
  "30-34": "30–34",
  "35-39": "35–39",
  "40+": "40+",
};
const LANG_TONES = [
  { bg: "#EFEEFC", deep: "#E1E0FA", ink: "#2E2B8F", sub: "#4B48C9", bar: "#5E5BE2", figure: "circles" as const },
  { bg: "#FEE9E0", deep: "#FCD9C9", ink: "#6E2A0C", sub: "#A8461C", bar: "#E07040", figure: "quarters" as const },
  { bg: "#E2F5F7", deep: "#CDEDF1", ink: "#0E4E58", sub: "#16727F", bar: "#14A3B8", figure: "leaves" as const },
];
const ageText = (key: string) =>
  key === "40+" ? "40 años o más" : key === "<18" ? "Menos de 18 años" : `${key.replace("-", " a ")} años`;

/* Quiénes son: sex (waffle), age ranges (columns, people or paid) and language, each with its conversion. */
function Who({ d }: { d: OverviewData }) {
  const [ageMode, setAgeMode] = useState<"people" | "paid">("people");
  const genders = d.breakdowns.gender.filter((g) => g.key !== "UNKNOWN" && g.users > 0);
  const knownGender = genders.reduce((a, g) => a + g.users, 0);
  /* Older backends only send the wide buckets. */
  const ages = (d.breakdowns.ageRanges ?? d.breakdowns.age.filter((a) => a.key !== "UNKNOWN")).filter(
    (a) => a.users > 0 || a.key !== "<18",
  );
  const knownAge = ages.reduce((a, g) => a + g.users, 0);
  const langs = d.breakdowns.language.filter((l) => l.key !== "UNKNOWN" && l.users > 0);
  const knownLang = langs.reduce((a, g) => a + g.users, 0);
  const noLang = d.breakdowns.language.find((l) => l.key === "UNKNOWN")?.users ?? 0;

  return (
    <>
      <SectionTitle
        tone="lilac"
        icon={<Icon.users size={18} />}
        title="Quiénes son"
        sub={`${plural(knownGender, "persona completó", "personas completaron")} “Queremos conocerte”.`}
      />
      <div className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Sexo" info="“Pagó” es de cada 100 de ese grupo." className="h-full">
          {knownGender ? (
            <Waffle
              parts={genders.map((g) => ({
                key: g.key,
                label: GENDER_LABEL[g.key],
                value: g.users,
                color: GENDER_COLOR[g.key] ?? "#B9B5AD",
                hint: `${n(g.users)} · pagó ${p(pct(g.subscribed, g.users))}`,
              }))}
            />
          ) : (
            <EmptyState compact title="Sin datos" />
          )}
        </Panel>

        <Panel
          title="Rango etario"
          info={ageMode === "people" ? "Qué parte tiene cada edad." : "De cada 100 de esa edad, cuántos pagaron."}
          actions={
            <Segmented
              size="sm"
              label="Qué ver"
              value={ageMode}
              onChange={setAgeMode}
              options={[
                { id: "people", label: "Personas" },
                { id: "paid", label: "Pagó" },
              ]}
            />
          }
          className="h-full"
        >
          {knownAge ? (
            <>
              <Columns
                key={ageMode}
                ariaLabel={ageMode === "people" ? "Personas por rango de edad" : "Qué parte pagó por rango de edad"}
                axis={false}
                barMax={44}
                labelEvery={1}
                height={230}
                color={ageMode === "people" ? SERIES[0] : SERIES[2]}
                values={(c) => `${n(c.v)}%`}
                data={ages.map((a) => ({
                  key: a.key,
                  label: AGE_RANGE_LABEL[a.key] ?? AGE_LABEL[a.key as AgeKey] ?? a.key,
                  v: ageMode === "people" ? Math.round(pct(a.users, knownAge)) : Math.round(pct(a.subscribed, a.users)),
                  tip: (
                    <>
                      <p className="mb-1 text-[12px] font-bold text-white/70">{ageText(a.key)}</p>
                      <TipRow label="Personas" value={`${n(a.users)} · ${p(pct(a.users, knownAge))}`} />
                      {a.completed !== undefined && (
                        <TipRow label="Llegó al paywall" value={p(pct(a.completed, a.users))} />
                      )}
                      <TipRow label="Pagó" value={p(pct(a.subscribed, a.users))} />
                    </>
                  ),
                }))}
              />
              {d.breakdowns.medianAge != null && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-purple-10 px-3 py-1.5 text-[12.5px] font-bold text-info">
                  Edad más común: {d.breakdowns.medianAge} años
                </p>
              )}
            </>
          ) : (
            <EmptyState compact title="Sin datos" />
          )}
        </Panel>

        <Panel
          title="Idioma"
          info={`El idioma de la app de cada persona.${noLang ? ` ${plural(noLang, "persona no tiene", "personas no tienen")} el dato y no se cuentan.` : ""}`}
          className="h-full lg:col-span-2 xl:col-span-1"
        >
          {knownLang ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
              {langs.map((l, i) => {
                const tone = LANG_TONES[i % LANG_TONES.length];
                const share = pct(l.users, knownLang);
                return (
                  <div
                    key={l.key}
                    className="relative overflow-hidden rounded-[16px] p-4"
                    style={{ background: tone.bg }}
                  >
                    <Figure kind={tone.figure} color={tone.deep} w={90} h={70} />
                    <p className="relative text-[14.5px] font-bold" style={{ color: tone.ink }}>
                      {langName(l.key)}
                    </p>
                    <p
                      className="relative mt-1 text-[34px] leading-none font-black tracking-[-0.03em] tnum"
                      style={{ color: tone.ink }}
                    >
                      {p(share)}
                    </p>
                    <div className="relative mt-3 h-[8px] overflow-hidden rounded-full bg-white/70">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, background: tone.bar }} />
                    </div>
                    <p className="relative mt-2 text-[12.5px] font-medium" style={{ color: tone.sub }}>
                      {[
                        `${n(l.users)} personas`,
                        l.completed !== undefined ? `completó ${p(pct(l.completed, l.users))}` : null,
                        `pagó ${p(pct(l.subscribed, l.users))}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState compact title="Sin datos en este período" />
          )}
        </Panel>
      </div>
    </>
  );
}

const TRAIT_LABEL: Record<string, string> = {
  HOW_TIME_SINCE: "Tiempo desde la ruptura",
  HOW_TIME_RELATIONSHIP_LAST: "Duración de la relación",
  WHO_MADE_THE_DECISION: "Quién terminó",
  WHAT_MOST_INFLUENCED: "Lo que más influyó",
  YOUR_EMOTIONS_NOW: "Lo que más siente",
  YOUR_ACTIONS_NOW: "Lo que más repite",
  YOUR_GOALS: "Lo que más quiere",
};

/* El perfil más común: the most repeated sex, age range and country, plus the top answer to each question. */
function CommonProfile({ d, profile }: { d: OverviewData; profile: MergedQuestion[] }) {
  const top = (rows: { key: string; users: number }[]) => {
    const known = rows.filter((r) => r.key !== "UNKNOWN" && r.users > 0);
    const total = known.reduce((a, r) => a + r.users, 0);
    const best = [...known].sort((a, b) => b.users - a.users)[0];
    return best ? { key: best.key, pct: pct(best.users, total) } : null;
  };
  const gender = top(d.breakdowns.gender);
  const age = top(d.breakdowns.ageRanges ?? d.breakdowns.age);
  const country = top(d.breakdowns.country);
  const traits = profile.filter((q) => TRAIT_LABEL[q.question] && q.options.length);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)]">
      <div className="relative flex flex-wrap items-center gap-4 overflow-hidden bg-lime p-5">
        <Figure kind="circles" color="#DCF65A" w={150} h={110} />
        <span className="relative">
          <Avatar look="violet" size={58} />
        </span>
        <div className="relative min-w-0 flex-1">
          <h2 className="text-[16px] font-bold text-ink">El perfil más común</h2>
          <p className="mt-0.5 text-[12.5px] font-medium text-[#4F5A12]">
            Lo que más se repite en el período. Tocá una respuesta para ver a esas personas.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {gender && (
              <Chip label={GENDER_LABEL[gender.key as keyof typeof GENDER_LABEL] ?? gender.key} pct={gender.pct} />
            )}
            {age && <Chip label={ageText(age.key)} pct={age.pct} />}
            {country && <Chip label={countryName(country.key)} pct={country.pct} />}
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 px-5 py-3">
        {traits.length ? (
          <dl className="grid gap-x-6 sm:grid-cols-2">
            {traits.map((q) => {
              const a = q.options[0];
              const href = `/tracking/users?${new URLSearchParams([
                ...q.keys.map((k) => ["question", k]),
                ...a.values.map((v) => ["answer", v]),
              ])}`;
              return (
                <div
                  key={q.question}
                  className="border-b border-bo-line py-2.5 last:border-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-0"
                >
                  <dt className="text-[12px] font-bold text-ink-60">{TRAIT_LABEL[q.question]}</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={href}
                      className="-mx-1.5 flex w-[calc(100%+12px)] press items-center gap-2 rounded-[9px] px-1.5 py-0.5 hover:bg-bo-soft"
                    >
                      <span className="min-w-0 flex-1 text-[14px] leading-[1.35] font-bold text-ink">{a.label}</span>
                      <span className="shrink-0 rounded-full bg-purple-10 px-2 py-0.5 text-[12px] font-black text-purple tnum">
                        {p(pct(a.count, q.answered))}
                      </span>
                    </Link>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <EmptyState compact title="Sin datos en este período" />
        )}
      </div>
    </section>
  );
}

function Chip({ label, pct: v }: { label: string; pct: number }) {
  return (
    <span className="inline-flex h-[32px] items-center gap-2 rounded-full bg-white pr-1.5 pl-3 text-[13.5px] font-bold text-ink shadow-[0_1px_2px_rgba(36,35,35,0.06)]">
      {label}
      <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-black text-purple tnum">{p(v)}</span>
    </span>
  );
}
