"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/shell/FilterBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Num } from "@/components/ui/Stat";
import { Segmented } from "@/components/ui/Tabs";
import { Columns, Heatmap, SERIES, TimeChart, WithTable } from "@/components/ui/charts";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { useTrackingFilters } from "@/lib/filters";
import { dayShort, n, n1, plural } from "@/lib/format";
import { useNinety, useNinetyUsers } from "@/lib/moderation/queries";
import type { NinetyTopUser } from "@/lib/moderation/types";
import { displayName, useNow, UserAvatar } from "../_shared/ui";
import { ago } from "@/lib/format";

/*
 * Moderation → Ninety. How the chatbot is used in the period: messages and people per day, the hour people write
 * and who writes the most (paged). Each conversation is in the person's profile; there is no topic data.
 */

const hh = (h: number) => `${String(h).padStart(2, "0")} h`;
const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];
const TOP_PAGE_SIZE = 10;

export function NinetyView() {
  const { filters } = useTrackingFilters();
  const q = useNinety(filters.range);
  const [metric, setMetric] = useState<"msgs" | "people">("msgs");
  const [paging, setPaging] = useState({ range: filters.range, page: 1 });
  const [topSort, setTopSort] = useState<SortState>({ key: "messages", desc: true });
  const page = paging.range === filters.range ? paging.page : 1;
  const top = useNinetyUsers(filters.range, { page, pageSize: TOP_PAGE_SIZE, sort: topSort });
  const now = useNow();
  const router = useRouter();

  const topColumns: Column<NinetyTopUser>[] = [
    {
      key: "user",
      header: "Persona",
      cell: (x) => (
        <span className="flex items-center gap-3">
          <UserAvatar id={x.userId} size={32} />
          <span className="min-w-0 truncate text-[14px] font-bold text-ink">{displayName(x)}</span>
        </span>
      ),
    },
    {
      key: "lastMessageAt",
      header: "Último mensaje",
      sortable: true,
      cell: (x) => <span className="whitespace-nowrap">{ago(Date.parse(x.lastMessageAt), now)}</span>,
    },
    {
      key: "messages",
      header: "Mensajes",
      sortable: true,
      align: "right",
      cell: (x) => <span className="text-[15px] font-black text-ink">{n(x.userMessages)}</span>,
    },
  ];

  const header = (
    <>
      <PageHeader title="Ninety" sub="Cómo usan el chatbot: cuánto, cuándo y quiénes." />
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
  /* Weekday × hour in each person's local time; older backends only send the hour in UTC. */
  const grid = d.perWeekdayHour
    ? Array.from({ length: 7 }, (_, wd) =>
        Array.from(
          { length: 24 },
          (_, h) => d.perWeekdayHour!.find((x) => x.weekday === wd && x.hour === h)?.userMessages ?? 0,
        ),
      )
    : null;
  const hours = grid
    ? Array.from({ length: 24 }, (_, h) => grid.reduce((a, row) => a + row[h], 0))
    : Array.from({ length: 24 }, (_, h) => d.perHour.find((x) => x.hour === h)?.userMessages ?? 0);
  const hourTotal = hours.reduce((a, b) => a + b, 0);
  const peak = hours.reduce((best, v, h) => (v > hours[best] ? h : best), 0);
  const night = hours.slice(20).reduce((a, b) => a + b, 0) + hours.slice(0, 4).reduce((a, b) => a + b, 0);
  const peakCell = grid?.flatMap((row, wd) => row.map((v, h) => ({ wd, h, v }))).reduce((a, b) => (b.v > a.v ? b : a));

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
        {grid ? (
          <Panel
            title="Cuándo le escriben"
            info="Hora local de cada persona (la que informa su celular; UTC si nunca la mandó)."
            sub={
              peakCell?.v
                ? `El pico es los ${WEEKDAYS[peakCell.wd]} a las ${hh(peakCell.h)}. ${n(Math.round((night / hourTotal) * 100))}% de noche (20 a 4 h).`
                : undefined
            }
          >
            <Heatmap grid={grid} valueLabel="mensajes" />
          </Panel>
        ) : (
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
        )}
        <Panel
          pad={false}
          title="Quiénes más le escriben"
          sub="En el período. La conversación está en el perfil de cada persona."
        >
          <div className="mt-4">
            <DataTable
              label="Quiénes más le escriben"
              columns={topColumns}
              rows={top.data?.items ?? []}
              rowKey={(x) => x.userId}
              sort={topSort}
              onSort={(s) => {
                setTopSort(s);
                setPaging({ range: filters.range, page: 1 });
              }}
              onRowClick={(x) => router.push(`/tracking/users/${x.userId}?tab=ninety`)}
              loading={top.isPending}
              minWidth={420}
              empty={<EmptyState compact title="Nadie le escribió en este período" />}
              pagination={
                top.data && {
                  page,
                  pageSize: top.data.pageSize,
                  totalCount: top.data.totalCount,
                  onPage: (p) => setPaging({ range: filters.range, page: p }),
                }
              }
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
