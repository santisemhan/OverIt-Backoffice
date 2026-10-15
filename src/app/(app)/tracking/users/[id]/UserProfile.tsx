"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { BarList, Columns, SERIES } from "@/components/ui/charts";
import { DataTable, Pager, sortRows, type Column, type SortState } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Figure } from "@/components/ui/KpiCard";
import { Menu } from "@/components/ui/Menu";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Meter } from "@/components/ui/Stat";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { countryName, langName } from "@/lib/filters";
import { ago, dateTime, dayLong, dayShort, n, plural, secs, time } from "@/lib/format";
import { useModerationComments, useModerationPosts } from "@/lib/moderation/queries";
import type { ModerationComment, ModerationPost } from "@/lib/moderation/types";
import {
  answerLabel,
  dayKey,
  EMOTION_LABEL,
  GENDER_LABEL,
  lookOf,
  money,
  pct,
  questionKey,
  questionLabel,
  sortQuestions,
  ts,
} from "@/lib/tracking/labels";
import { useGrantAccess, useRenameUser, useRevokeAccess } from "@/lib/tracking/mutations";
import { useNinetyMessages, useUser } from "@/lib/tracking/queries";
import type { UserDetail } from "@/lib/tracking/types";
import { displayName, ErrorPanel, OnbBadge, SubBadge } from "../../_ui";

/*
 * Tracking → Users → one person: header, journey and tabs with what the API returns, including the ex's name, the
 * future-me message, the Ninety conversation and their posts and comments (paged).
 */

const LIST_PAGE_SIZE = 10;

const CHALLENGE_COLUMNS: Column<UserDetail["challenges"][number]>[] = [
  {
    key: "day",
    header: "Día",
    sortable: true,
    cell: (c) => <span className="font-bold text-ink-60 tnum">Día {c.day}</span>,
  },
  { key: "title", header: "Reto", sortable: true, cell: (c) => <span className="font-bold text-ink">{c.title}</span> },
  { key: "date", header: "Fecha", sortable: true, cell: (c) => dayShort(dayKey(c.date)) },
  {
    key: "completed",
    header: "Estado",
    sortable: true,
    align: "right",
    cell: (c) =>
      c.completed ? (
        <Badge size="sm" tone="ok">
          Completó
        </Badge>
      ) : (
        <Badge size="sm">Pendiente</Badge>
      ),
  },
];

const READ_COLUMNS: Column<UserDetail["resourceReads"][number]>[] = [
  {
    key: "type",
    header: "Tipo",
    sortable: true,
    cell: (r) => (
      <Badge size="sm" tone={r.type === "Article" ? "info" : "lime"}>
        {r.type === "Article" ? "Artículo" : "Tip"}
      </Badge>
    ),
  },
  {
    key: "title",
    header: "Título",
    sortable: true,
    cell: (r) => <span className="font-bold text-ink">{r.title}</span>,
  },
  { key: "readAt", header: "Cuándo", sortable: true, cell: (r) => dateTime(ts(r.readAt)) },
];

type TabId = "onboarding" | "progress" | "resources" | "ninety" | "subscription" | "community";
const TABS: TabId[] = ["onboarding", "progress", "resources", "ninety", "subscription", "community"];

export function UserProfile({ id }: { id: string }) {
  const q = useUser(id);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);

  const asked = params.get("tab") as TabId | null;
  const askedTab: TabId = asked && TABS.includes(asked) ? asked : "onboarding";
  const setTab = (t: TabId) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const back = (
    <Link
      href="/tracking/users"
      className="mb-3 -ml-2 inline-flex h-[30px] press items-center gap-1 rounded-[9px] px-2 text-[13.5px] font-bold text-ink-60 hover:bg-ink/5 hover:text-ink"
    >
      <Icon.back size={16} />
      Usuarios
    </Link>
  );

  if (q.isError) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return (
      <>
        {back}
        {missing ? (
          <Panel>
            <EmptyState
              icon={<Icon.users size={22} />}
              title="No encontramos a este usuario"
              text="Puede que el link esté mal copiado o que la cuenta se haya borrado."
              action={<Button onClick={() => router.push("/tracking/users")}>Volver a Usuarios</Button>}
            />
          </Panel>
        ) : (
          <ErrorPanel error={q.error} onRetry={() => void q.refetch()} />
        )}
      </>
    );
  }
  if (!q.data)
    return (
      <>
        {back}
        <PageSkeleton />
      </>
    );

  const u = q.data;
  const look = lookOf(u.id);
  const band = { bg: "#EFEEFC", deep: "#E1E0FA" };
  const chatTotal = u.chat.userMessages + u.chat.assistantMessages;
  const communityTotal = u.community.posts + u.community.comments;
  /* Without paying (or a courtesy grant) the app stays locked: those tabs can only be empty. */
  const noApp = u.status !== "ACTIVE" && !u.hasAccess && !u.plan;
  const disabled: Record<TabId, boolean> = {
    onboarding: false,
    progress: noApp && !u.emotions.length && !u.challenges.length,
    resources: noApp && !u.resourceReads.length,
    ninety: noApp && !chatTotal,
    /* Always open: the courtesy access is granted from there. */
    subscription: false,
    community: noApp && !communityTotal,
  };
  const tab: TabId = disabled[askedTab] ? "onboarding" : askedTab;

  return (
    <>
      {back}
      <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)]">
        <div className="relative h-[76px] overflow-hidden" style={{ background: band.bg }}>
          <Figure kind="circles" color={band.deep} w={200} h={76} />
          <div className="absolute top-3 right-3">
            <Menu
              label="Acciones sobre este usuario"
              items={[
                { label: "Cambiar nombre visible", icon: <Icon.pencil size={17} />, onClick: () => setRenaming(true) },
                {
                  label: "Acceso de cortesía",
                  icon: <Icon.star size={17} />,
                  onClick: () => setTab("subscription"),
                },
                {
                  label: "Copiar link del perfil",
                  icon: <Icon.link size={17} />,
                  onClick: () => {
                    navigator.clipboard?.writeText(`${location.origin}/tracking/users/${u.id}`).then(
                      () => toast({ text: "Link copiado" }),
                      () => toast({ text: "No se pudo copiar el link", tone: "bad" }),
                    );
                  },
                },
              ]}
            />
          </div>
        </div>
        <div className="px-5 sm:px-6">
          <div className="relative -mt-[38px] flex items-start gap-4">
            <span className="shrink-0 rounded-full bg-white p-[5px] shadow-[0_6px_18px_rgba(36,35,35,0.12)]">
              <Avatar look={look} size={78} muted={!u.name} />
            </span>
            <div className="min-w-0 flex-1 pt-[46px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="flex items-center gap-1">
                  <h1 className="text-[28px] leading-[1.05] font-black tracking-[-0.03em] text-ink">
                    {displayName(u)}
                  </h1>
                  <IconButton label="Cambiar nombre visible" onClick={() => setRenaming(true)}>
                    <Icon.pencil size={17} />
                  </IconButton>
                </span>
                {u.plan?.movedOnAt && (
                  <Badge tone="lime" icon={<Icon.check size={12} strokeWidth={2.6} />}>
                    Superado
                  </Badge>
                )}
                {u.hasAccess && <Badge tone="ok">Con acceso</Badge>}
              </div>
              <p className="mt-1 truncate text-[13.5px] font-medium text-ink-60">
                <span className="tnum">#{u.id.slice(0, 8)}</span> · {u.email}
                {u.providers.length > 0 &&
                  ` · entró con ${u.providers.map((p) => (p === "APPLE" ? "Apple" : "Google")).join(" y ")}`}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(u.age || u.gender) && (
              <Tag icon={<Icon.users size={13} />}>
                {[u.age ? `${u.age} años` : null, u.gender ? GENDER_LABEL[u.gender] : null].filter(Boolean).join(" · ")}
              </Tag>
            )}
            {u.country && <Tag icon={<Icon.globe size={13} />}>{countryName(u.country)}</Tag>}
            {u.language && <Tag icon={<Icon.chat size={13} />}>{langName(u.language)}</Tag>}
            {u.lastDevice && <Tag icon={<Icon.phone size={13} />}>{u.lastDevice}</Tag>}
            {u.feedbackCount > 0 && (
              <Tag icon={<Icon.inbox size={13} />}>
                {plural(u.feedbackCount, "mensaje al equipo", "mensajes al equipo")}
              </Tag>
            )}
          </div>
        </div>
        <Journey u={u} />
      </section>

      <div className="mt-6">
        <Tabs
          label="Secciones del perfil"
          value={tab}
          onChange={setTab}
          items={[
            { id: "onboarding", label: "Onboarding" },
            { id: "progress", label: "Progreso", disabled: disabled.progress },
            {
              id: "resources",
              label: "Recursos",
              count: u.resourceReads.length || undefined,
              disabled: disabled.resources,
            },
            { id: "ninety", label: "Ninety", count: u.chat.userMessages || undefined, disabled: disabled.ninety },
            { id: "subscription", label: "Suscripción", disabled: disabled.subscription },
            {
              id: "community",
              label: "Comunidad",
              count: communityTotal || undefined,
              disabled: disabled.community,
            },
          ]}
        />
      </div>
      <div className="mt-5">
        {tab === "onboarding" && <OnboardingTab u={u} />}
        {tab === "progress" && <ProgressTab u={u} />}
        {tab === "resources" && <ResourcesTab u={u} />}
        {tab === "ninety" && <NinetyTab u={u} total={chatTotal} />}
        {tab === "subscription" && <SubscriptionTab u={u} />}
        {tab === "community" && (
          <div className="grid gap-5">
            <CommunityTab u={u} />
            <div className="grid gap-5 lg:grid-cols-2">
              <UserContent u={u} kind="posts" />
              <UserContent u={u} kind="comments" />
            </div>
          </div>
        )}
      </div>

      {/* Keyed so every opening starts from the current (server-formatted) name. */}
      <RenameDialog key={`${renaming}-${u.name ?? ""}`} u={u} open={renaming} onClose={() => setRenaming(false)} />
    </>
  );
}

function Tag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#F3F1EC] pr-3 pl-1.5 text-[13px] font-bold text-ink-70">
      <span className="flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-white px-1 text-ink-70">
        {icon}
      </span>
      {children}
    </span>
  );
}

/* ─────────── Journey ─────────── */

type StepState = "done" | "ok" | "half" | "fail" | "todo" | "now";

function Journey({ u }: { u: UserDetail }) {
  const [now] = useState(() => Date.now());
  const s = u.subscription;
  const steps: { label: string; value: ReactNode; sub: ReactNode; state: StepState }[] = [
    u.createdAt
      ? { label: "Se registró", value: dayShort(ts(u.createdAt)), sub: ago(ts(u.createdAt), now), state: "done" }
      : { label: "Se registró", value: "—", sub: "sin fecha", state: "done" },
    u.status === "ACTIVE"
      ? { label: "Onboarding", value: "Completó", sub: "", state: "ok" }
      : u.status === "PENDING_SECOND_ONBOARDING"
        ? { label: "Onboarding", value: "A medias", sub: "", state: "half" }
        : { label: "Onboarding", value: "No lo hizo", sub: "sin respuestas", state: "fail" },
    s
      ? { label: "Pagó", value: s.productId ?? "Suscripción", sub: dayShort(ts(s.firstSeenAt)), state: "done" }
      : u.hasAccess
        ? { label: "Pagó", value: "Cortesía", sub: "acceso regalado", state: "done" }
        : { label: "Pagó", value: "No pagó", sub: "sin suscripción", state: u.status === "ACTIVE" ? "fail" : "todo" },
    u.plan
      ? {
          label: "Contador",
          value: u.plan.movedOnAt ? "Superado" : `Día ${n(u.plan.currentDay)}`,
          sub: `de ${n(u.plan.totalDays)} · desde el ${dayShort(ts(u.plan.startedAt))}`,
          state: "done",
        }
      : { label: "Contador", value: "—", sub: "sin contador", state: "todo" },
    { label: "Última vez", value: ago(ts(u.lastLogin), now), sub: dateTime(ts(u.lastLogin)), state: "now" },
  ];
  const node = (st: StepState) =>
    st === "done" ? (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-purple text-white">
        <Icon.check size={13} strokeWidth={3} />
      </span>
    ) : st === "ok" ? (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ok text-white">
        <Icon.check size={13} strokeWidth={3} />
      </span>
    ) : st === "half" ? (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#E5A50A] text-white">
        <Icon.clock size={13} strokeWidth={2.5} />
      </span>
    ) : st === "fail" ? (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-bad text-white">
        <Icon.x size={13} strokeWidth={3} />
      </span>
    ) : st === "now" ? (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink text-white">
        <Icon.clock size={13} />
      </span>
    ) : (
      <span className="h-[26px] w-[26px] rounded-full border-2 border-dashed border-[#D9D5CC] bg-white" />
    );
  return (
    <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 border-t border-bo-line px-5 py-5 sm:grid-cols-5 sm:px-6">
      {steps.map((st) => (
        <li key={st.label} className="min-w-0">
          {node(st.state)}
          <p className="mt-2 text-[12px] font-bold text-ink-60">{st.label}</p>
          <p
            className={cx(
              "truncate text-[15px] font-black",
              st.state === "fail"
                ? "text-bad"
                : st.state === "half"
                  ? "text-[#9A6A00]"
                  : st.state === "ok"
                    ? "text-ok"
                    : "text-ink",
            )}
          >
            {st.value}
          </p>
          <p className="truncate text-[12.5px] font-medium text-ink-60">{st.sub}</p>
        </li>
      ))}
    </ol>
  );
}

/* ─────────── Tabs ─────────── */

function OnboardingTab({ u }: { u: UserDetail }) {
  const o = u.onboarding;
  if (!o)
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <EmptyState compact icon={<Icon.chat size={22} />} title="No respondió el onboarding" />
        </Panel>
        <PersonalData u={u} />
      </div>
    );
  const answers = sortQuestions(
    Object.entries(o.answers).map(([question, values]) => ({ question: questionKey(question), values })),
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel title="Lo que respondió" actions={<OnbBadge status={u.status} size="sm" />}>
        {answers.length ? (
          <dl className="divide-y divide-bo-line">
            {answers.map((a) => (
              <div key={a.question} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-[12.5px] font-bold text-ink-60">{questionLabel(a.question)}</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.values.length ? (
                    a.values.map((v) => (
                      <Badge key={v} tone="info">
                        {answerLabel(v)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[13px] font-medium text-ink-60">Sin respuesta</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <EmptyState compact title="Sin respuestas" />
        )}
      </Panel>
      <div className="grid content-start gap-5">
        <PersonalData u={u} />
        <Panel title="Por qué terminó">
          {o.breakupMotives.length ? (
            <div className="flex flex-wrap gap-1.5">
              {o.breakupMotives.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] font-medium text-ink-60">No cargó motivos.</p>
          )}
        </Panel>
        <Panel title="Más datos">
          <dl className="divide-y divide-bo-line">
            <div className="py-3 first:pt-0">
              <dt className="text-[12.5px] font-bold text-ink-60">El nombre de su ex</dt>
              <dd className="mt-1 text-[13.5px] font-bold break-words text-ink">
                {o.exName ?? <span className="font-medium text-ink-60">No lo escribió.</span>}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-[12.5px] font-bold text-ink-60">Mensaje para su yo del futuro</dt>
              <dd className="mt-1 text-[13.5px] font-medium break-words whitespace-pre-line text-ink">
                {o.futureMessage ? `“${o.futureMessage}”` : <span className="text-ink-60">No lo escribió.</span>}
              </dd>
            </div>
            {o.commitmentSignedAt && (
              <div className="py-3 last:pb-0">
                <dt className="text-[12.5px] font-bold text-ink-60">Compromiso de contacto cero</dt>
                <dd className="mt-1 text-[13.5px] font-medium text-ink">
                  {`Lo firmó el ${dayLong(ts(o.commitmentSignedAt))} a las ${time(ts(o.commitmentSignedAt))}.`}
                </dd>
              </div>
            )}
          </dl>
        </Panel>
      </div>
    </div>
  );
}

/* Sus datos: what the person told us about themselves and how far the sign-up flow went. */
function PersonalData({ u }: { u: UserDetail }) {
  const s = u.subscription;
  const paywall = s
    ? `Compró ${s.productId ?? "una suscripción"}`
    : u.status === "PENDING_ONBOARDING"
      ? "No llegó"
      : "No compró";
  return (
    <Panel title="Sus datos">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <Item label="Nombre" value={u.name ?? "—"} />
        <Item label="Edad" value={u.age ? `${u.age} años` : "—"} />
        <Item label="Género" value={u.gender ? GENDER_LABEL[u.gender] : "—"} />
        <Item
          label="Registro"
          value={
            u.providers.length ? u.providers.map((p) => (p === "APPLE" ? "Con Apple" : "Con Google")).join(" y ") : "—"
          }
        />
        <Item label="País" value={u.country ? countryName(u.country) : "—"} />
        <Item label="Idioma" value={u.language ? langName(u.language) : "—"} />
        {u.referralCode !== undefined && <Item label="Código de referido" value={u.referralCode ?? "Sin código"} />}
        {u.pushNotifications !== undefined && (
          <Item
            label="Notificaciones"
            value={u.pushNotifications === null ? "—" : u.pushNotifications ? "Permitió" : "No permitió"}
          />
        )}
        <Item label="Contacto Cero" value={u.onboarding?.commitmentSignedAt ? "Selló el compromiso" : "—"} />
        <Item label="Paywall" value={paywall} />
      </dl>
    </Panel>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-bold text-ink-60">{label}</dt>
      <dd className="mt-0.5 truncate text-[14px] font-bold text-ink">{value}</dd>
    </div>
  );
}

function ProgressTab({ u }: { u: UserDetail }) {
  const p = u.plan;
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "date", desc: true });
  const counts = new Map<string, number>();
  for (const e of u.emotions) counts.set(e.emotion, (counts.get(e.emotion) ?? 0) + 1);
  const done = u.challenges.filter((c) => c.completed).length;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Contador">
        {p ? (
          <>
            <p className="text-[38px] leading-none font-black tracking-[-0.035em] text-ink">
              {p.movedOnAt ? "Superado" : `Día ${n(p.currentDay)}`}
              <span className="ml-2 text-[16px] font-bold text-ink-60">de {n(p.totalDays)}</span>
            </p>
            <div className="mt-4">
              <Meter value={pct(Math.min(p.currentDay, p.totalDays), p.totalDays)} label="Avance del contador" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-ink-60">
              Corre desde el {dayLong(ts(p.startedAt))} · termina el {dayLong(ts(p.finishDate))}
              {p.movedOnAt && ` · superó el ${dayLong(ts(p.movedOnAt))}`}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-ink-60">
              Los reinicios no se guardan: cada reinicio reemplaza el contador.
            </p>
          </>
        ) : (
          <EmptyState compact title="Todavía no tiene contador" />
        )}
      </Panel>
      <Panel title="Emociones registradas" sub={plural(u.emotions.length, "registro", "registros")}>
        {u.emotions.length ? (
          <BarList
            format={(r) => n(r.value)}
            rows={[...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({
                key: k,
                label: EMOTION_LABEL[k as keyof typeof EMOTION_LABEL] ?? k,
                value: v,
                pct: pct(v, u.emotions.length),
              }))}
          />
        ) : (
          <EmptyState compact title="No registró emociones" />
        )}
      </Panel>
      <Panel
        className="lg:col-span-2"
        pad={false}
        title="Retos"
        sub={`${n(done)} de ${plural(u.challenges.length, "reto asignado", "retos asignados")} completados`}
      >
        {u.challenges.length ? (
          <div className="mt-4">
            <DataTable
              label="Retos"
              columns={CHALLENGE_COLUMNS}
              rows={sortRows(u.challenges, sort, {
                day: (c) => c.day,
                title: (c) => c.title,
                date: (c) => c.date,
                completed: (c) => (c.completed ? 1 : 0),
              }).slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE)}
              rowKey={(c) => `${c.challengeId}-${c.date}`}
              sort={sort}
              onSort={(s) => {
                setSort(s);
                setPage(1);
              }}
              minWidth={520}
              pagination={{ page, pageSize: LIST_PAGE_SIZE, totalCount: u.challenges.length, onPage: setPage }}
            />
          </div>
        ) : (
          <div className="mt-4 border-t border-bo-line">
            <EmptyState compact title="Sin retos asignados" />
          </div>
        )}
      </Panel>
    </div>
  );
}

function ResourcesTab({ u }: { u: UserDetail }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "readAt", desc: true });
  return (
    <Panel pad={false} title="Leyó" sub={plural(u.resourceReads.length, "artículo o tip", "artículos y tips")}>
      {u.resourceReads.length ? (
        <div className="mt-4">
          <DataTable
            label="Leyó"
            columns={READ_COLUMNS}
            rows={sortRows(u.resourceReads, sort, {
              type: (r) => r.type,
              title: (r) => r.title,
              readAt: (r) => ts(r.readAt),
            }).slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE)}
            rowKey={(r) => `${r.resourceId}-${r.readAt}`}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            minWidth={520}
            pagination={{ page, pageSize: LIST_PAGE_SIZE, totalCount: u.resourceReads.length, onPage: setPage }}
          />
        </div>
      ) : (
        <div className="mt-4 border-t border-bo-line">
          <EmptyState compact icon={<Icon.book size={22} />} title="No leyó nada todavía" />
        </div>
      )}
    </Panel>
  );
}

function NinetyTab({ u, total }: { u: UserDetail; total: number }) {
  const c = u.chat;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Panel title="Ninety" tone="lilac">
        <dl className="grid grid-cols-2 gap-3">
          <Kpi label="Sus mensajes" value={n(c.userMessages)} />
          <Kpi label="Respuestas" value={n(c.assistantMessages)} />
          <Kpi label="Conversaciones" value={n(c.conversations)} />
          <Kpi label="Llamadas" value={n(c.voiceCalls)} sub={c.voiceSeconds ? secs(c.voiceSeconds) : undefined} />
        </dl>
      </Panel>
      <Panel title="Mensajes por día">
        {total && c.perDay.length ? (
          <Columns
            ariaLabel="Mensajes a Ninety por día"
            color={SERIES[0]}
            valueLabel="mensajes"
            data={c.perDay.map((d) => ({ key: d.date, label: dayShort(dayKey(d.date)), v: d.userMessages }))}
          />
        ) : (
          <EmptyState compact icon={<Icon.chat size={22} />} title="No le escribió a Ninety" />
        )}
      </Panel>
      <Conversation u={u} />
    </div>
  );
}

function Conversation({ u }: { u: UserDetail }) {
  const [page, setPage] = useState(1);
  const q = useNinetyMessages(u.id, page, 20);
  const messages = q.data ? [...q.data.items].reverse() : [];
  return (
    <Panel
      className="lg:col-span-2"
      pad={false}
      title="Conversación"
      sub={q.data ? `${plural(q.data.totalCount, "mensaje", "mensajes")} · los más recientes primero` : undefined}
    >
      {q.isError && !q.data ? (
        <div className="mt-4 border-t border-bo-line">
          <EmptyState
            compact
            icon={<Icon.alert size={22} />}
            title="No pudimos cargar la conversación"
            action={<Button onClick={() => void q.refetch()}>Reintentar</Button>}
          />
        </div>
      ) : !q.data ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[56px] rounded-[14px]" />
          ))}
        </div>
      ) : messages.length ? (
        <>
          <ol className={cx("mt-4 space-y-2.5 border-t border-bo-line px-5 py-4", q.isFetching && "opacity-60")}>
            {messages.map((m) => (
              <li key={m.id} className={cx("flex", m.role === "User" ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[85%] rounded-[16px] px-3.5 py-2.5",
                    m.role === "User" ? "bg-purple text-white" : "bg-bo-soft text-ink",
                  )}
                >
                  <p className="text-[13.5px] font-medium break-words whitespace-pre-line">{m.content}</p>
                  <p
                    className={cx(
                      "mt-1 text-[11.5px] font-medium",
                      m.role === "User" ? "text-white/75" : "text-ink-60",
                    )}
                  >
                    {`${m.role === "User" ? displayName(u) : "Ninety"} · ${dateTime(ts(m.createdAt))}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Pager page={page} pageSize={q.data.pageSize} totalCount={q.data.totalCount} onPage={setPage} />
        </>
      ) : (
        <div className="mt-4 border-t border-bo-line">
          <EmptyState compact icon={<Icon.chat size={22} />} title="No le escribió a Ninety" />
        </div>
      )}
    </Panel>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[14px] bg-white/70 p-3">
      <dt className="text-[12px] font-bold text-[#4B48C9]">{label}</dt>
      <dd className="mt-0.5 text-[22px] font-black text-[#2E2B8F] tnum">{value}</dd>
      {sub && <dd className="text-[12px] font-medium text-[#4B48C9]">{sub}</dd>}
    </div>
  );
}

const PAYMENT_LABEL: Record<string, string> = {
  INITIAL_PURCHASE: "Primera compra",
  RENEWAL: "Renovación",
  NON_RENEWING_PURCHASE: "Compra única",
};

function SubscriptionTab({ u }: { u: UserDetail }) {
  const s = u.subscription;
  const toast = useToast();
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();
  const [granting, setGranting] = useState(false);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const activeGrant = u.grants.find((g) => g.status === "Active");

  const row = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-[13px] font-medium text-ink-60">{label}</dt>
      <dd className="text-right text-[13.5px] font-bold text-ink">{value}</dd>
    </div>
  );
  const date = (v: string | null) => (v ? dayLong(ts(v)) : "—");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Suscripción" actions={s && <SubBadge size="sm" bucket={s.bucket} expiresAt={s.expiresAt} />}>
        {s ? (
          <dl className="divide-y divide-bo-line">
            {row("Producto", s.productId ?? "—")}
            {row("Tienda", s.store ?? "—")}
            {s.periodType && row("Período", s.periodType)}
            {s.environment &&
              s.environment !== "PRODUCTION" &&
              row(
                "Entorno",
                <Badge size="sm" tone="warn">
                  {s.environment}
                </Badge>,
              )}
            {row("Primera compra", date(s.firstSeenAt))}
            {row("Último cobro", date(s.latestPurchaseAt))}
            {row(s.willRenew ? "Renueva el" : "Vence el", date(s.expiresAt))}
            {s.unsubscribeDetectedAt && row("Canceló el", date(s.unsubscribeDetectedAt))}
            {s.billingIssueDetectedAt && row("Problema de cobro", date(s.billingIssueDetectedAt))}
          </dl>
        ) : (
          <EmptyState compact icon={<Icon.card size={22} />} title="Nunca compró una suscripción" />
        )}
      </Panel>
      <div className="grid content-start gap-5">
        <Panel
          title="Acceso de cortesía"
          sub="Acceso premium regalado por el equipo."
          actions={
            activeGrant ? (
              <Button size="sm" variant="dangerSoft" onClick={() => setRevoking(activeGrant.grantId)}>
                Quitar acceso
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={<Icon.plus size={14} />} onClick={() => setGranting(true)}>
                Dar acceso
              </Button>
            )
          }
        >
          {u.grants.length ? (
            <ul className="divide-y divide-bo-line">
              {u.grants.map((g) => (
                <li key={g.grantId} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13.5px] font-bold text-ink">{g.reason}</span>
                    <Badge size="sm" tone={g.status === "Active" ? "ok" : "neutral"}>
                      {g.status === "Active" ? "Activo" : g.status === "Revoked" ? "Quitado" : "Vencido"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] font-medium text-ink-60">
                    Desde el {dayShort(ts(g.startsAt))}
                    {g.expiresAt ? ` hasta el ${dayShort(ts(g.expiresAt))}` : " · sin vencimiento"}
                    {g.revokedAt && ` · quitado el ${dayShort(ts(g.revokedAt))}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] font-medium text-ink-60">Nunca tuvo acceso de cortesía.</p>
          )}
        </Panel>
        <Panel title="Cobros" sub="Lo que pagó en su moneda y el estimado en USD de RevenueCat.">
          {u.payments.length ? (
            <ul className="divide-y divide-bo-line">
              {u.payments.map((p) => (
                <li key={p.paymentId} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-ink">
                      {PAYMENT_LABEL[p.eventType] ?? p.eventType}
                      {p.productId && <span className="font-medium text-ink-60">{` · ${p.productId}`}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-ink-60">
                      {dayShort(ts(p.purchasedAt))}
                      {p.store && ` · ${p.store}`}
                      {p.environment === "SANDBOX" && (
                        <Badge size="sm" tone="warn">
                          Sandbox
                        </Badge>
                      )}
                      {p.refundedAt && (
                        <Badge size="sm" tone="bad">
                          {`Reintegrado el ${dayShort(ts(p.refundedAt))}`}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cx("text-[13.5px] font-bold text-ink tnum", p.refundedAt && "line-through")}>
                      {money(p.amountLocal, p.currency)}
                    </p>
                    {p.currency !== "USD" && (
                      <p className="text-[12px] font-medium text-ink-60 tnum">≈ {money(p.amountUsd, "USD")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] font-medium text-ink-60">No hay cobros registrados.</p>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={granting}
        title="Dar acceso de cortesía"
        text={`${displayName(u)} va a tener acceso premium sin pagar.`}
        confirm="Dar acceso"
        tone="primary"
        loading={grant.isPending}
        disabled={!reason.trim()}
        onClose={() => setGranting(false)}
        onConfirm={() =>
          grant.mutate(
            {
              email: u.email,
              reason: reason.trim(),
              expiresAtUtc: until ? new Date(`${until}T23:59:59`).toISOString() : null,
            },
            {
              onSuccess: () => {
                toast({ text: "Le diste acceso de cortesía" });
                setGranting(false);
                setReason("");
                setUntil("");
              },
              onError: (e) => toast({ text: describeError(e), tone: "bad" }),
            },
          )
        }
      >
        <div className="space-y-3">
          <Field label="Motivo" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} autoFocus />
          <Field
            label="Hasta (opcional)"
            type="date"
            value={until}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setUntil(e.target.value)}
            hint="Sin fecha, no vence."
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={!!revoking}
        title="Quitar el acceso de cortesía"
        text="Pierde el acceso premium ahora, salvo que tenga una suscripción paga."
        confirm="Quitar acceso"
        loading={revoke.isPending}
        onClose={() => setRevoking(null)}
        onConfirm={() =>
          revoking &&
          revoke.mutate(revoking, {
            onSuccess: () => {
              toast({ text: "Quitaste el acceso de cortesía" });
              setRevoking(null);
            },
            onError: (e) => toast({ text: describeError(e), tone: "bad" }),
          })
        }
      />
    </div>
  );
}

function CommunityTab({ u }: { u: UserDetail }) {
  const c = u.community;
  const items: [string, number][] = [
    ["Publicaciones", c.posts],
    ["Comentarios", c.comments],
    ["Publicaciones eliminadas", c.removedPosts],
    ["Comentarios eliminados", c.removedComments],
    ["Me gusta que dio", c.likesGiven],
    ["Reportes que hizo", c.reportsMade],
    ["Reportes que recibió", c.reportsReceived],
    ["Personas que bloqueó", c.blockedUsers],
    ["Lo bloquearon", c.blockedBy],
  ];
  return (
    <Panel title="Comunidad">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(([label, v]) => (
          <div key={label} className="rounded-[14px] bg-bo-soft p-3.5">
            <dt className="text-[12px] font-bold text-ink-60">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-black text-ink tnum">{n(v)}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function ContentStatus({ x }: { x: ModerationPost | ModerationComment }) {
  if (x.removedAt)
    return (
      <Badge size="sm" tone="bad">
        Eliminado
      </Badge>
    );
  if (x.openReports > 0 || (x.flag && !x.reviewedAt))
    return (
      <Badge size="sm" tone="warn">
        Para revisar
      </Badge>
    );
  return (
    <Badge size="sm" tone="ok">
      Publicado
    </Badge>
  );
}

function UserContent({ u, kind }: { u: UserDetail; kind: "posts" | "comments" }) {
  const [page, setPage] = useState(1);
  const params = { status: "any" as const, search: "", userId: u.id, page, pageSize: LIST_PAGE_SIZE };
  const posts = useModerationPosts(params);
  const comments = useModerationComments(params);
  const q = kind === "posts" ? posts : comments;
  const total = kind === "posts" ? u.community.posts : u.community.comments;
  return (
    <Panel
      pad={false}
      title={kind === "posts" ? "Publicaciones" : "Comentarios"}
      sub={plural(
        total,
        kind === "posts" ? "publicación" : "comentario",
        kind === "posts" ? "publicaciones" : "comentarios",
      )}
      actions={
        total > 0 && (
          <Link
            href={`/moderation/community?user=${u.id}`}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-purple hover:underline"
          >
            Moderar <Icon.arrowRight size={14} />
          </Link>
        )
      }
    >
      {!q.data ? (
        <div className="space-y-2 p-5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[52px] rounded-[12px]" />
          ))}
        </div>
      ) : q.data.items.length ? (
        <>
          <ul className={cx("mt-4 divide-y divide-bo-line border-t border-bo-line", q.isFetching && "opacity-60")}>
            {q.data.items.map((x) => (
              <li key={x.id} className="px-5 py-3">
                <p className="text-[13.5px] font-medium break-words whitespace-pre-line text-ink">{x.text}</p>
                {"postText" in x && x.postText && (
                  <p className="mt-1 truncate text-[12px] font-medium text-ink-60">{`En: “${x.postText}”`}</p>
                )}
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-ink-60">
                  <ContentStatus x={x} />
                  {dateTime(ts(x.createdAt))}
                  {x.reports > 0 && ` · ${plural(x.reports, "reporte", "reportes")}`}
                </p>
              </li>
            ))}
          </ul>
          <Pager page={page} pageSize={q.data.pageSize} totalCount={q.data.totalCount} onPage={setPage} />
        </>
      ) : (
        <div className="mt-4 border-t border-bo-line">
          <EmptyState compact title={kind === "posts" ? "No publicó nada" : "No comentó nada"} />
        </div>
      )}
    </Panel>
  );
}

/* ─────────── Rename ─────────── */

function RenameDialog({ u, open, onClose }: { u: UserDetail; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const rename = useRenameUser(u.id);
  const [name, setName] = useState(u.name ?? "");
  const value = name.trim();
  const invalid = value.length < 1 || value.length > 50;
  return (
    <ConfirmDialog
      open={open}
      title="Cambiar nombre visible"
      text="Es el nombre que ven los demás en Comunidad. La cuenta no cambia."
      confirm="Guardar"
      tone="primary"
      loading={rename.isPending}
      disabled={invalid || value === (u.name ?? "")}
      onClose={() => {
        setName(u.name ?? "");
        onClose();
      }}
      onConfirm={() =>
        rename.mutate(value, {
          onSuccess: () => {
            toast({ text: "Cambiaste el nombre visible" });
            onClose();
          },
          onError: (e) => toast({ text: describeError(e), tone: "bad" }),
        })
      }
    >
      <Field
        label="Nombre"
        value={name}
        maxLength={50}
        counter={{ n: name.length, max: 50 }}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
    </ConfirmDialog>
  );
}
