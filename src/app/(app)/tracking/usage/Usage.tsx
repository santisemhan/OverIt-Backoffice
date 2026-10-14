"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/shell/FilterBar";
import { Panel } from "@/components/ui/Card";
import { BarList, SERIES, TimeChart, WithTable } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { SectionTitle, StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { HScroll } from "@/components/ui/HScroll";
import { Segmented } from "@/components/ui/Tabs";
import { useTrackingFilters } from "@/lib/filters";
import { dayShort, n, plural } from "@/lib/format";
import type { ToneId } from "@/lib/tones";
import { dayKey, EMOTION_LABEL, FEATURE_LABEL, pct } from "@/lib/tracking/labels";
import { useUsage } from "@/lib/tracking/queries";
import type { FeatureKey, UsageMetrics } from "@/lib/tracking/types";
import { ErrorPanel } from "../_ui";

/*
 * Tracking → Usage. Distinct active people per day and what they use. Only actions the backend stores count
 * as activity (emotions, challenges, reads, favorites, Ninety, community): app opens, breathings, the panic button
 * and counter resets are not recorded.
 */

type PerDayKey = Exclude<keyof UsageMetrics["perDay"][number], "date">;
const PER_DAY: { id: PerDayKey; label: string }[] = [
  { id: "emotions", label: "Emociones" },
  { id: "challengesCompleted", label: "Retos" },
  { id: "resourceReads", label: "Lecturas" },
  { id: "chatMessages", label: "Ninety" },
  { id: "posts", label: "Publicaciones" },
  { id: "comments", label: "Comentarios" },
];

const TILE: Partial<Record<FeatureKey, { tone: ToneId; icon: React.ReactNode }>> = {
  emotions: { tone: "peach", icon: <Icon.heart size={15} /> },
  challengesCompleted: { tone: "lime", icon: <Icon.flame size={15} /> },
  resourceReads: { tone: "sky", icon: <Icon.book size={15} /> },
  chatMessages: { tone: "lilac", icon: <Icon.chat size={15} /> },
};

export function Usage() {
  const { filters } = useTrackingFilters();
  const q = useUsage(filters.range);
  const d = q.data;
  const [metric, setMetric] = useState<PerDayKey>("emotions");

  const active = useMemo(
    () =>
      d
        ? [
            {
              id: "active",
              label: "Activos",
              color: SERIES[0],
              points: d.activePerDay.map((x) => ({ t: dayKey(x.date), v: x.users })),
            },
          ]
        : [],
    [d],
  );
  const perDay = useMemo(
    () =>
      d
        ? [
            {
              id: metric,
              label: PER_DAY.find((m) => m.id === metric)!.label,
              color: SERIES[1],
              points: d.perDay.map((x) => ({ t: dayKey(x.date), v: x[metric] })),
            },
          ]
        : [],
    [d, metric],
  );

  return (
    <>
      <PageHeader title="Uso de la app" sub="Cuántos la usan cada día y qué usan." />
      <FilterBar country={false} lang={false} />
      {q.isError && !d ? (
        <ErrorPanel error={q.error} onRetry={() => void q.refetch()} />
      ) : !d ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4 @min-[58rem]:gap-5">
            {(Object.keys(TILE) as FeatureKey[]).map((k) => {
              const f = d.features.find((x) => x.key === k);
              return (
                <StatTile
                  key={k}
                  tone={TILE[k]!.tone}
                  icon={TILE[k]!.icon}
                  label={FEATURE_LABEL[k]}
                  value={<Num value={f?.events ?? 0} />}
                  note={plural(f?.users ?? 0, "persona", "personas")}
                />
              );
            })}
          </div>

          <div className="mt-5">
            <Panel title="Activos por día" info="Personas distintas con al menos una acción registrada ese día (UTC).">
              {d.activePerDay.length ? (
                <WithTable
                  label="Activos por día"
                  table={{
                    cols: ["Día", "Activos"],
                    rows: d.activePerDay.map((x) => [dayShort(dayKey(x.date)), x.users]),
                  }}
                >
                  <TimeChart series={active} legend={false} />
                </WithTable>
              ) : (
                <EmptyState compact title="Sin actividad en este período" />
              )}
            </Panel>
          </div>

          <SectionTitle
            tone="lilac"
            icon={<Icon.overview size={18} />}
            title="Por función"
            sub="Acciones y personas en el período."
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Panel title="Qué usan">
              <BarList
                format={(r) => r.hint as string}
                rows={[...d.features]
                  .sort((a, b) => b.events - a.events)
                  .map((f) => ({
                    key: f.key,
                    label: FEATURE_LABEL[f.key] ?? f.key,
                    value: f.events,
                    pct: pct(f.events, Math.max(1, ...d.features.map((x) => x.events))),
                    hint: `${n(f.events)} · ${plural(f.users, "persona", "personas")}`,
                  }))}
              />
            </Panel>
            <Panel title="Cómo se sienten" sub="Emociones registradas en el período.">
              {d.emotions.length ? (
                (() => {
                  const total = d.emotions.reduce((a, e) => a + e.count, 0);
                  return (
                    <BarList
                      color={SERIES[1]}
                      rows={[...d.emotions]
                        .sort((a, b) => b.count - a.count)
                        .map((e) => ({
                          key: e.emotion,
                          label: EMOTION_LABEL[e.emotion] ?? e.emotion,
                          value: e.count,
                          pct: pct(e.count, total),
                        }))}
                    />
                  );
                })()
              ) : (
                <EmptyState compact title="Nadie registró emociones" />
              )}
            </Panel>
          </div>

          <div className="mt-5">
            <Panel title="Por día">
              {/* Scrolls sideways on phones instead of widening the page. */}
              <HScroll
                label="Función"
                arrows={false}
                fade="#FFFFFF"
                className="-mx-1 mb-3"
                innerClassName="no-scrollbar px-1"
              >
                <Segmented label="Función" size="sm" options={PER_DAY} value={metric} onChange={setMetric} />
              </HScroll>
              {d.perDay.length ? (
                <TimeChart series={perDay} legend={false} />
              ) : (
                <EmptyState compact title="Sin datos" />
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
