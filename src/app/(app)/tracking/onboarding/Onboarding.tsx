"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { PhoneShot } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { BarList, SERIES, TipRow } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { HScroll } from "@/components/ui/HScroll";
import { Icon } from "@/components/ui/icons";
import { SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Meter, Num } from "@/components/ui/Stat";
import { cx } from "@/lib/cx";
import { filtersQuery, useTrackingFilters } from "@/lib/filters";
import { n, p, plural, secs } from "@/lib/format";
import { pct, questionLabel, sortQuestions } from "@/lib/tracking/labels";
import { funnelRows, PAYWALL, shot, SIGN_UP, STEPS, type FunnelRow } from "@/lib/tracking/onboarding";
import { useOnboardingFunnel, useOverview, useUsers } from "@/lib/tracking/queries";
import type { Overview } from "@/lib/tracking/types";
import { ErrorPanel, UserCell } from "../_ui";

/*
 * Tracking → Onboarding. The whole funnel (one column per screen: who went on and who left there), the strip of real
 * screens with their numbers, the detail of the picked screen (?screen=<id>) and everything people answered. Screens
 * before "plan" happen before sign-up, so they count installs; the answers count people who signed up in the period.
 */
/** Usuarios filtered by one onboarding answer. */
const answerHref = (question: string, answer: string) => `/tracking/users?${new URLSearchParams({ question, answer })}`;

export function Onboarding() {
  const { filters } = useTrackingFilters();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = useOverview(filters);
  const f = useOnboardingFunnel(filters);
  const d = q.data;
  const fun = useMemo(() => (f.data ? funnelRows(f.data) : null), [f.data]);
  const fromUrl = params.get("screen");
  const sel = STEPS.find((s) => s.id === fromUrl)?.id ?? fun?.worst?.step.id ?? STEPS[0].id;
  const strip = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLDivElement>(null);

  const pickStep = (id: string, scrollDetail = false) => {
    const next = new URLSearchParams(params);
    next.set("screen", id);
    router.replace(`${pathname}?${next}`, { scroll: false });
    strip.current
      ?.querySelector<HTMLElement>(`[data-step="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    if (scrollDetail)
      requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const centered = useRef(false);
  useEffect(() => {
    const card = strip.current?.querySelector<HTMLElement>(`[data-step="${sel}"]`);
    if (centered.current || !card || !strip.current) return;
    strip.current.scrollLeft = card.offsetLeft - strip.current.clientWidth / 2 + card.clientWidth / 2;
    centered.current = true;
  }, [fun, sel]);

  const err = (q.isError && !d) || (f.isError && !f.data);

  return (
    <>
      <PageHeader title="Onboarding" sub="Cada pantalla, en orden: quiénes llegan, quiénes se van y cuánto tardan." />
      <FilterBar />
      {err ? (
        <ErrorPanel
          error={q.error ?? f.error}
          onRetry={() => {
            void q.refetch();
            void f.refetch();
          }}
        />
      ) : !d || !fun || !f.data ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4 @min-[58rem]:gap-5">
            <StatTile
              tone="sand"
              figure="rings"
              icon={<Icon.phone size={15} />}
              label="Abrieron la app"
              value={<Num value={f.data.devices} />}
              note="instalaciones que empezaron el onboarding"
            />
            <StatTile
              tone="violet"
              figure="circles"
              icon={<Icon.users size={15} />}
              label="Se registraron"
              value={<Num value={d.funnel.downloads} />}
              note="cuentas creadas en el período"
              onClick={() => router.push("/tracking/users")}
            />
            <StatTile
              tone="mint"
              figure="leaves"
              icon={<Icon.check size={15} />}
              label="Completaron"
              value={<Num value={d.funnel.onboardingCompleted} />}
              note={`${p(pct(d.funnel.onboardingCompleted, d.funnel.downloads))} de los registrados`}
              onClick={() => router.push("/tracking/users?onboarding=completed")}
            />
            <StatTile
              tone="peach"
              figure="quarters"
              icon={<Icon.x size={15} />}
              label="No completaron"
              value={<Num value={Math.max(0, d.funnel.downloads - d.funnel.onboardingCompleted)} />}
              note="les falta alguna parte"
              onClick={() => router.push("/tracking/users?onboarding=notCompleted")}
            />
          </div>

          <div className="mt-5">
            <Panel
              title="El embudo, pantalla por pantalla"
              info="Cada columna son las instalaciones que llegaron a esa pantalla. En naranja, las que cerraron la app ahí. Tocá una para ver su detalle."
            >
              {f.data.devices ? (
                <FunnelChart
                  rows={fun.rows}
                  total={f.data.devices}
                  selected={sel}
                  worst={fun.worst?.step.id}
                  onPick={(id) => pickStep(id, true)}
                />
              ) : (
                <EmptyState compact title="Sin datos en este período" text="Probá con un período más largo." />
              )}
            </Panel>
          </div>

          <div className="mt-5">
            <Panel
              title="Las pantallas"
              info="Deslizá para recorrer el onboarding. El borde rojo marca dónde más gente se va."
              actions={
                <>
                  <IconButton
                    label="Pantallas anteriores"
                    onClick={() =>
                      strip.current?.scrollBy({ left: -strip.current.clientWidth * 0.8, behavior: "smooth" })
                    }
                  >
                    <Icon.back size={18} />
                  </IconButton>
                  <IconButton
                    label="Pantallas siguientes"
                    onClick={() =>
                      strip.current?.scrollBy({ left: strip.current.clientWidth * 0.8, behavior: "smooth" })
                    }
                  >
                    <Icon.arrowRight size={18} />
                  </IconButton>
                </>
              }
              pad={false}
            >
              <HScroll
                label="Pantallas del onboarding"
                scrollRef={strip}
                arrows={false}
                className="overflow-hidden rounded-b-[20px]"
                innerClassName="snap-x scroll-px-5"
              >
                <div className="relative flex w-max gap-3 px-5 pt-4 pb-5">
                  {fun.rows.map((r) => (
                    <StepCard
                      key={r.step.id}
                      r={r}
                      on={r.step.id === sel}
                      worst={r.step.id === fun.worst?.step.id}
                      onClick={() => pickStep(r.step.id, true)}
                    />
                  ))}
                </div>
              </HScroll>
            </Panel>
          </div>

          <div ref={detail} className="scroll-mt-28 lg:scroll-mt-6">
            <StepDetail
              row={fun.rows.find((r) => r.step.id === sel)!}
              d={d}
              worst={sel === fun.worst?.step.id}
              onPick={(id) => pickStep(id)}
            />
          </div>

          <SectionTitle
            tone="lilac"
            icon={<Icon.chat size={18} />}
            title="Qué respondieron"
            sub="Porcentaje sobre quienes respondieron cada pregunta. En las de varias opciones suman más de 100%. Tocá una respuesta para ver quiénes la eligieron."
          />
          {d.onboardingAnswers.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {sortQuestions(d.onboardingAnswers).map((qa, i) => (
                <Panel
                  key={qa.question}
                  title={questionLabel(qa.question)}
                  sub={plural(qa.answered, "respuesta", "respuestas")}
                >
                  <BarList
                    color={SERIES[i % SERIES.length]}
                    onPick={(a) => router.push(answerHref(qa.question, a))}
                    rows={[...qa.options]
                      .sort((a, b) => b.count - a.count)
                      .map((o) => ({ key: o.answer, label: o.answer, value: o.count, pct: pct(o.count, qa.answered) }))}
                  />
                </Panel>
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState compact title="Nadie respondió el onboarding en este período" />
            </Panel>
          )}

          <SectionTitle
            tone="peach"
            icon={<Icon.heart size={18} />}
            title="Por qué terminó"
            sub="Los motivos de la segunda parte del onboarding."
          />
          <Panel>
            {d.breakupMotives.length ? (
              (() => {
                const total = d.breakupMotives.reduce((a, m) => a + m.count, 0);
                return (
                  <BarList
                    color={SERIES[1]}
                    format={(r) => n(r.value)}
                    onPick={(a) => router.push(answerHref("breakupMotives", a))}
                    rows={[...d.breakupMotives]
                      .sort((a, b) => b.count - a.count)
                      .map((m) => ({ key: m.answer, label: m.answer, value: m.count, pct: pct(m.count, total) }))}
                  />
                );
              })()
            ) : (
              <EmptyState compact title="Nadie cargó motivos en este período" />
            )}
          </Panel>
          <p className="mt-4 flex items-center gap-2 text-[12.5px] font-medium text-ink-60">
            <Icon.lock size={14} /> El nombre de su ex y el mensaje para su yo del futuro son privados: no se muestran
            acá.
          </p>
        </>
      )}
    </>
  );
}

/* ─────────── Funnel (stacked columns: went on + left here) ─────────── */

function FunnelChart({
  rows,
  total,
  selected,
  worst,
  onPick,
}: {
  rows: FunnelRow[];
  total: number;
  selected: string;
  worst?: string;
  onPick: (id: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 210;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-70">
          <span className="h-[9px] w-[9px] rounded-full bg-c1" />
          Siguieron
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-70">
          <span className="h-[9px] w-[9px] rounded-full bg-c2" />
          Cerraron la app en esa pantalla
        </span>
      </div>
      <div className="-mx-1 no-scrollbar overflow-x-auto px-1">
        <div
          className="relative grid gap-[2px] sm:gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}
          onPointerLeave={() => setHover(null)}
        >
          {rows.map((r, i) => {
            const stay = r.reached - r.left;
            const isSel = r.step.id === selected;
            return (
              <button
                key={r.step.id}
                type="button"
                onClick={() => onPick(r.step.id)}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${r.step.label}: llegaron ${r.reached}, se fueron ${r.left}`}
                className={cx(
                  "relative flex flex-col items-stretch rounded-[8px] px-[2px] pt-1",
                  (isSel || hover === i) && "bg-bo-soft",
                )}
              >
                <span className="relative flex w-full flex-col justify-end" style={{ height: H }}>
                  {r.step.id === worst && (
                    <span
                      className="absolute left-1/2 z-[1] -translate-x-1/2 rounded-full bg-bad px-1.5 py-px text-[10.5px] font-bold whitespace-nowrap text-white"
                      style={{ bottom: (r.reached / total) * H + 6 }}
                    >
                      Foco
                    </span>
                  )}
                  <span
                    className="mx-auto flex w-full max-w-[26px] grow-y flex-col gap-[2px]"
                    style={{ animationDelay: `${i * 18}ms` }}
                  >
                    {r.left > 0 && (
                      <span
                        className="w-full rounded-t-[4px] bg-c2"
                        style={{ height: Math.max(2, (r.left / total) * H) }}
                      />
                    )}
                    {stay > 0 && (
                      <span
                        className={cx("w-full bg-c1", r.left === 0 && "rounded-t-[4px]")}
                        style={{
                          height: Math.max(1, (stay / total) * H - (r.left > 0 ? 2 : 0)),
                          opacity: isSel || hover === i || hover === null ? 1 : 0.55,
                        }}
                      />
                    )}
                  </span>
                </span>
                <span
                  className={cx(
                    "mt-1.5 block text-center text-[10.5px] font-bold tnum sm:text-[11.5px]",
                    isSel ? "text-purple" : "text-ink-60",
                    i % 2 === 1 && !isSel && "max-sm:opacity-0",
                  )}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-20 min-w-[200px] rounded-[12px] bg-ink px-3 py-2.5 text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              style={
                hover > rows.length * 0.6
                  ? { right: `${((rows.length - hover) / rows.length) * 100}%` }
                  : { left: `${((hover + 1) / rows.length) * 100}%` }
              }
            >
              <p className="mb-1.5 text-[12.5px] font-bold">
                {hover + 1}. {rows[hover].step.label}
              </p>
              <TipRow color={SERIES[0]} label="Llegaron" value={`${n(rows[hover].reached)} · ${p(rows[hover].kept)}`} />
              <TipRow
                color={SERIES[1]}
                label="Se fueron acá"
                value={`${n(rows[hover].left)} · ${p(rows[hover].exitRate)}`}
              />
              <TipRow
                label="Tiempo (mediana)"
                value={rows[hover].medianSeconds === null ? "—" : secs(rows[hover].medianSeconds!)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── One screen in the strip ─────────── */

function StepCard({ r, on, worst, onClick }: { r: FunnelRow; on: boolean; worst: boolean; onClick: () => void }) {
  const high = r.i < PAYWALL && r.exitRate >= 8;
  return (
    <button
      type="button"
      data-step={r.step.id}
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "relative flex w-[156px] shrink-0 press snap-start flex-col rounded-[16px] p-3 text-left transition-colors",
        on ? "bg-purple-10 shadow-[inset_0_0_0_2px_#5E5BE2]" : "hover:bg-bo-soft",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cx(
            "flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-black tnum",
            on ? "bg-purple text-white" : "bg-[#ECE9E2] text-ink-70",
          )}
        >
          {r.i + 1}
        </span>
        {worst && (
          <Badge tone="bad" size="sm">
            Mayor abandono
          </Badge>
        )}
        {r.step.skip && !worst && <Badge size="sm">Se puede saltar</Badge>}
      </span>
      <span className="mt-2 line-clamp-2 min-h-[34px] text-[13px] leading-[1.3] font-bold text-ink">
        {r.step.label}
      </span>
      <PhoneShot
        src={shot(r.step.id)}
        alt={`Pantalla: ${r.step.title}`}
        width={132}
        className="mt-2.5"
        ring={worst ? "bad" : null}
      />
      <span className="mt-3 block text-[12px] font-bold text-ink-60">Llegaron</span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-black text-ink tnum">{n(r.reached)}</span>
        <span className="text-[12px] font-bold text-ink-60 tnum">{p(r.kept)}</span>
      </span>
      <span className="mt-1.5 block">
        <Meter value={r.kept} label={`${p(r.kept)} del total`} />
      </span>
      <span className="mt-3 block border-t border-bo-line pt-2.5 text-[12px] font-bold text-ink-60">Se fueron acá</span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className={cx("text-[15px] font-black tnum", high ? "text-bad" : "text-ink")}>{n(r.left)}</span>
        <span className={cx("text-[12px] font-bold tnum", high ? "text-bad" : "text-ink-60")}>{p(r.exitRate)}</span>
      </span>
      <span className="mt-2.5 flex items-baseline justify-between gap-2 border-t border-bo-line pt-2.5">
        <span className="text-[12px] font-bold text-ink-60">Tiempo</span>
        <span className="text-[12.5px] font-bold text-ink tnum">
          {r.medianSeconds === null ? "—" : secs(r.medianSeconds)}
        </span>
      </span>
      {r.skipped > 0 && (
        <span className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-bold text-ink-60">Saltaron</span>
          <span className="text-[12.5px] font-bold text-ink tnum">{n(r.skipped)}</span>
        </span>
      )}
    </button>
  );
}

/* ─────────── The picked screen ─────────── */

function StepDetail({
  row,
  d,
  worst,
  onPick,
}: {
  row: FunnelRow;
  d: Overview;
  worst: boolean;
  onPick: (id: string) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { filters } = useTrackingFilters();
  const step = row.step;
  const anonymous = row.i < SIGN_UP;
  const people = useUsers(
    {
      search: "",
      onboarding: null,
      subscription: null,
      leftAt: step.id,
      country: filters.country === "all" ? null : filters.country,
      language: filters.lang === "all" ? null : filters.lang,
    },
    { page: 1, pageSize: 5, sort: null },
    !anonymous,
  );
  const answers = step.question ? d.onboardingAnswers.find((a) => a.question === step.question) : undefined;
  const usersHref = () => {
    const q = new URLSearchParams(filtersQuery(params));
    q.delete("period");
    q.set("leftAt", step.id);
    return `/tracking/users?${q}`;
  };

  return (
    <Panel className="mt-5" pad={false}>
      <div className="grid gap-6 p-5 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 md:p-6">
        <div className="flex flex-col items-center gap-3">
          <PhoneShot src={shot(step.id)} alt={`Pantalla: ${step.title}`} width={210} ring={worst ? "bad" : "purple"} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={row.i === 0}
              onClick={() => onPick(STEPS[row.i - 1].id)}
              icon={<Icon.back size={15} />}
            >
              Anterior
            </Button>
            <Button size="sm" disabled={row.i === PAYWALL} onClick={() => onPick(STEPS[row.i + 1].id)}>
              Siguiente
              <Icon.arrowRight size={15} />
            </Button>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">
              Pantalla {row.i + 1} de {STEPS.length}
            </Badge>
            {worst && (
              <Badge tone="bad" icon={<Icon.alert size={13} />}>
                Acá se va más gente: hacé foco acá
              </Badge>
            )}
            {step.skip && <Badge>Tiene “Saltar”</Badge>}
            {anonymous && <Badge>Antes del registro</Badge>}
          </div>
          <h2 className="mt-3 text-[22px] leading-[1.15] font-black tracking-[-0.02em] text-ink">{step.label}</h2>
          <p className="mt-1 text-[14px] font-medium text-ink-60">“{step.title}”</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Box label="Llegaron" value={n(row.reached)} sub={`${p(row.kept)} del total`} />
            <Box
              label="Cerraron la app acá"
              value={n(row.left)}
              sub={`${p(row.exitRate)} de los que llegaron`}
              tone={row.exitRate >= 8 && row.i < PAYWALL ? "bad" : undefined}
            />
            <Box
              label="Tiempo en pantalla"
              value={row.medianSeconds === null ? "—" : secs(row.medianSeconds)}
              sub="mediana"
            />
            <Box
              label="Saltaron"
              value={step.skip ? n(row.skipped) : "—"}
              sub={step.skip ? `${p(pct(row.skipped, row.reached))} tocó “Saltar”` : "No se puede saltar"}
            />
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              {answers ? (
                <>
                  <h3 className="text-[14px] font-bold text-ink">Qué respondieron</h3>
                  <p className="mt-0.5 mb-3 text-[12.5px] font-medium text-ink-60">
                    {`${plural(answers.answered, "respuesta", "respuestas")} de quienes se registraron en el período`}
                  </p>
                  <BarList
                    onPick={(a) => router.push(answerHref(answers.question, a))}
                    rows={[...answers.options]
                      .sort((a, b) => b.count - a.count)
                      .map((o) => ({
                        key: o.answer,
                        label: o.answer,
                        value: o.count,
                        pct: pct(o.count, answers.answered),
                      }))}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-[14px] font-bold text-ink">Qué pasa acá</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.55] font-medium text-ink-70">
                    {anonymous
                      ? "Pantalla anterior al registro: los que se van acá no llegan a tener cuenta. Si el tiempo es muy bajo, la están salteando sin leer."
                      : "Pantalla posterior al registro: los que se van acá tienen cuenta y se pueden ver en Usuarios."}
                  </p>
                </>
              )}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-ink">Quiénes cerraron la app acá</h3>
              {anonymous ? (
                <p className="mt-2 text-[13.5px] font-medium text-ink-60">
                  Todavía no tenían cuenta: no se puede saber quiénes son.
                </p>
              ) : people.isPending ? (
                <Skeleton className="mt-2 h-[120px] rounded-[12px]" />
              ) : people.data?.items.length ? (
                <>
                  <ul className="mt-2 divide-y divide-bo-line">
                    {people.data.items.map((u) => (
                      <li key={u.id}>
                        <Link
                          href={`/tracking/users/${u.id}`}
                          className="-mx-2 flex press items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-bo-soft"
                        >
                          <span className="min-w-0 flex-1">
                            <UserCell u={u} />
                          </span>
                          <Icon.chevron size={16} className="text-ink-60" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={usersHref()}
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-purple hover:underline"
                  >
                    {`Ver ${people.data.totalCount === 1 ? "a la persona" : `a las ${n(people.data.totalCount)}`} en Usuarios`}
                    <Icon.arrowRight size={14} />
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-[13.5px] font-medium text-ink-60">
                  Nadie con cuenta cerró la app en esta pantalla.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Box({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "bad" }) {
  return (
    <div className="rounded-[14px] bg-bo-soft p-3.5 shadow-[inset_0_0_0_1px_#EFEDE7]">
      <dt className="text-[12px] font-bold text-ink-60">{label}</dt>
      <dd
        className={cx(
          "mt-1 text-[22px] leading-none font-black tracking-[-0.02em]",
          tone === "bad" ? "text-bad" : "text-ink",
        )}
      >
        {value}
      </dd>
      <dd className="mt-1 text-[11.5px] leading-[1.35] font-medium text-ink-60">{sub}</dd>
    </div>
  );
}
