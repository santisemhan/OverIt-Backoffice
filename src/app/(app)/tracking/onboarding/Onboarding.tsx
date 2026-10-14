"use client";

import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/shell/FilterBar";
import { Panel } from "@/components/ui/Card";
import { BarList, SERIES } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { useTrackingFilters } from "@/lib/filters";
import { n, p, plural } from "@/lib/format";
import { pct, questionLabel, sortQuestions } from "@/lib/tracking/labels";
import { useOverview } from "@/lib/tracking/queries";
import { ErrorPanel, NotMeasured } from "../_ui";

/*
 * Tracking → Onboarding. Who finished it and what they answered (people who signed up in the period). The app only
 * sends the final payload, so there is no per-screen funnel, time per screen or "skipped". The users list cannot be
 * filtered by answer (the API has no such filter), so answers are not links; the KPI tiles are.
 */
/** Usuarios filtered by one onboarding answer. */
const answerHref = (question: string, answer: string) => `/tracking/users?${new URLSearchParams({ question, answer })}`;

export function Onboarding() {
  const { filters } = useTrackingFilters();
  const router = useRouter();
  const q = useOverview(filters.range);
  const d = q.data;

  return (
    <>
      <PageHeader title="Onboarding" sub="Quién lo termina y qué responde." />
      <FilterBar country={false} lang={false} />
      {q.isError && !d ? (
        <ErrorPanel error={q.error} onRetry={() => void q.refetch()} />
      ) : !d ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 @min-[58rem]:gap-5">
            <StatTile
              tone="violet"
              figure="circles"
              icon={<Icon.users size={15} />}
              label="Empezaron"
              value={<Num value={d.funnel.downloads} />}
              note="se registraron en el período"
              onClick={() => router.push("/tracking/users")}
            />
            <StatTile
              tone="mint"
              figure="leaves"
              icon={<Icon.check size={15} />}
              label="Completaron"
              value={<Num value={d.funnel.onboardingCompleted} />}
              note={`${p(pct(d.funnel.onboardingCompleted, d.funnel.downloads))} de los que empezaron`}
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
            <Panel title="Pantalla por pantalla" info="Embudo, tiempo por pantalla y quiénes saltaron preguntas.">
              <NotMeasured text="La app manda las respuestas una sola vez, al terminar: no sabemos en qué pantalla cerró la app cada persona ni cuánto tardó en cada una." />
            </Panel>
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
