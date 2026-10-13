"use client";

import { useState } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/shell/FilterBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { Segmented } from "@/components/ui/Tabs";
import { Columns, SERIES, TimeChart, WithTable } from "@/components/ui/charts";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { useTrackeoFilters } from "@/lib/filters";
import { dayShort, n, n1, plural } from "@/lib/format";
import { useNinety } from "@/lib/moderacion/queries";
import { displayName, useNow, UserAvatar } from "../_shared/ui";
import { ago } from "@/lib/format";

/*
 * Moderación → Ninety. How the chatbot is used in the period: messages and people per day, the hour people write
 * and who writes the most. Counts only: conversations are never exposed (privacy), and there is no topic data.
 */

const hh = (h: number) => `${String(h).padStart(2, "0")} h`;

export function NinetyView() {
  const { filters } = useTrackeoFilters();
  const q = useNinety(filters.range);
  const [metric, setMetric] = useState<"msgs" | "people">("msgs");
  const now = useNow();

  const header = (
    <>
      <PageHeader
        title="Ninety"
        sub="Cómo usan el chatbot: cuánto, cuándo y quiénes. Nunca se muestra lo que escriben."
      />
      <FilterBar country={false} lang={false} />
    </>
  );

  if (q.isPending)
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );
  if (q.isError)
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon={<Icon.alert size={22} />}
            title="No pudimos cargar los datos de Ninety"
            text={describeError(q.error)}
            action={<Button onClick={() => q.refetch()}>Reintentar</Button>}
          />
        </Panel>
      </>
    );

  const d = q.data;
  const t = d.totals;
  if (!t.userMessages && !t.voiceCalls)
    return (
      <>
        {header}
        <Panel>
          <EmptyState title="Nadie le escribió a Ninety en este período" icon={<Icon.chat size={22} />} />
        </Panel>
      </>
    );

  const msgs = d.perDay.map((x) => ({ t: Date.parse(x.date), v: x.userMessages }));
  const people = d.perDay.map((x) => ({ t: Date.parse(x.date), v: x.users }));
  const hours = Array.from({ length: 24 }, (_, h) => d.perHour.find((x) => x.hour === h)?.userMessages ?? 0);
  const hourTotal = hours.reduce((a, b) => a + b, 0);
  const peak = hours.reduce((best, v, h) => (v > hours[best] ? h : best), 0);
  const night = hours.slice(20).reduce((a, b) => a + b, 0) + hours.slice(0, 4).reduce((a, b) => a + b, 0);

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-3 @min-[58rem]:grid-cols-4">
        <StatTile
          tone="violet"
          figure="circles"
          icon={<Icon.chat size={15} />}
          label="Mensajes"
          value={<Num value={t.userMessages} />}
          note={`${plural(t.conversations, "conversación", "conversaciones")} · ${n(t.assistantMessages)} respuestas`}
        />
        <StatTile
          tone="lilac"
          figure="halves"
          icon={<Icon.users size={15} />}
          label="Le escribieron"
          value={<Num value={t.users} />}
          note="personas distintas"
        />
        <StatTile
          tone="sky"
          figure="quarters"
          icon={<Icon.quote size={15} />}
          label="Por persona"
          value={n1(t.users ? t.userMessages / t.users : 0)}
          note="mensajes en promedio"
        />
        <StatTile
          tone="sand"
          figure="rings"
          icon={<Icon.phone size={15} />}
          label="Llamadas de voz"
          value={<Num value={t.voiceCalls} />}
          note={`${n(t.voiceMinutes)} min en total`}
        />
      </div>

      <Panel
        className="mt-5"
        title="Uso por día"
        sub={
          metric === "msgs" ? "Mensajes enviados a Ninety cada día." : "Personas distintas que le escribieron cada día."
        }
        actions={
          <Segmented
            size="sm"
            label="Qué ver"
            value={metric}
            onChange={setMetric}
            options={[
              { id: "msgs", label: "Mensajes" },
              { id: "people", label: "Personas" },
            ]}
          />
        }
      >
        {d.perDay.length ? (
          <WithTable
            label="Uso de Ninety por día"
            table={{
              cols: ["Día", "Mensajes", "Personas"],
              rows: d.perDay.map((x) => [dayShort(Date.parse(x.date)), x.userMessages, x.users]),
            }}
          >
            <TimeChart
              key={metric}
              series={[
                metric === "msgs"
                  ? { id: "m", label: "Mensajes", color: SERIES[0], points: msgs }
                  : { id: "p", label: "Personas", color: SERIES[2], points: people },
              ]}
              height={250}
            />
          </WithTable>
        ) : (
          <EmptyState compact title="Sin datos por día en este período" />
        )}
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel
          title="A qué hora le escriben"
          sub={
            hourTotal
              ? `El pico es a las ${hh(peak)} (UTC). ${n(Math.round((night / hourTotal) * 100))}% de noche (20 a 4 h).`
              : "Hora UTC."
          }
        >
          <Columns
            ariaLabel="Mensajes por hora del día (UTC)"
            valueLabel="mensajes"
            data={hours.map((v, h) => ({ key: String(h), label: hh(h), v }))}
            labelEvery={3}
          />
        </Panel>
        <Panel title="Quiénes más le escriben" sub="En el período. Solo la cantidad, nunca el contenido.">
          {d.topUsers.length ? (
            <ol className="divide-y divide-bo-line">
              {d.topUsers.map((x, i) => (
                <li key={x.userId}>
                  <Link
                    href={`/trackeo/usuarios/${x.userId}`}
                    className="-mx-2 flex w-[calc(100%+16px)] press items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-bo-soft"
                  >
                    <span className="w-5 text-right text-[12.5px] font-bold text-ink-60 tnum">{i + 1}</span>
                    <UserAvatar id={x.userId} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">{displayName(x)}</span>
                      <span className="block text-[12px] font-medium text-ink-60">
                        Último mensaje: {ago(Date.parse(x.lastMessageAt), now).toLowerCase()}
                      </span>
                    </span>
                    <span className="text-[15px] font-black text-ink tnum">{n(x.userMessages)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact title="Nadie le escribió en este período" />
          )}
        </Panel>
      </div>
    </>
  );
}
