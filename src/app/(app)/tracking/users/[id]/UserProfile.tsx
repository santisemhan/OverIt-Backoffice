"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { BarList, Columns, SERIES } from "@/components/ui/charts";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Figure } from "@/components/ui/KpiCard";
import { Menu } from "@/components/ui/Menu";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Meter } from "@/components/ui/Stat";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ago, dateTime, dayLong, dayShort, n, plural, secs } from "@/lib/format";
import {
  dayKey,
  EMOTION_LABEL,
  GENDER_LABEL,
  lookOf,
  money,
  pct,
  questionLabel,
  sortQuestions,
  ts,
} from "@/lib/tracking/labels";
import { useGrantAccess, useRenameUser, useRevokeAccess } from "@/lib/tracking/mutations";
import { useUser } from "@/lib/tracking/queries";
import type { UserDetail } from "@/lib/tracking/types";
import { displayName, ErrorPanel, OnbBadge, SubBadge } from "../../_ui";

/*
 * Tracking → Users → one person: header, journey and tabs with what the API returns. Privacy: the ex's name, the
 * future-me message and the Ninety conversation are never returned by the API and never shown here.
 */

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
  const tab: TabId = asked && TABS.includes(asked) ? asked : "onboarding";
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
                <h1 className="text-[28px] leading-[1.05] font-black tracking-[-0.03em] text-ink">{displayName(u)}</h1>
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
            { id: "progress", label: "Progreso" },
            { id: "resources", label: "Recursos", count: u.resourceReads.length || undefined },
            { id: "ninety", label: "Ninety", count: u.chat.userMessages || undefined },
            { id: "subscription", label: "Suscripción" },
            { id: "community", label: "Comunidad", count: communityTotal || undefined },
          ]}
        />
      </div>
      <div className="mt-5">
        {tab === "onboarding" && <OnboardingTab u={u} />}
        {tab === "progress" && <ProgressTab u={u} />}
        {tab === "resources" && <ResourcesTab u={u} />}
        {tab === "ninety" && <NinetyTab u={u} total={chatTotal} />}
        {tab === "subscription" && <SubscriptionTab u={u} />}
        {tab === "community" && <CommunityTab u={u} />}
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

type StepState = "done" | "fail" | "todo" | "now";

function Journey({ u }: { u: UserDetail }) {
  const [now] = useState(() => Date.now());
  const s = u.subscription;
  const steps: { label: string; value: ReactNode; sub: ReactNode; state: StepState }[] = [
    u.createdAt
      ? { label: "Se registró", value: dayShort(ts(u.createdAt)), sub: ago(ts(u.createdAt), now), state: "done" }
      : { label: "Se registró", value: "—", sub: "sin fecha", state: "done" },
    u.status === "ACTIVE"
      ? {
          label: "Onboarding",
          value: "Completó",
          sub: u.onboarding?.commitmentSignedAt
            ? `firmó el ${dayShort(ts(u.onboarding.commitmentSignedAt))}`
            : "las dos partes",
          state: "done",
        }
      : u.status === "PENDING_SECOND_ONBOARDING"
        ? { label: "Onboarding", value: "A medias", sub: "le falta la segunda parte", state: "fail" }
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
          <p className={cx("truncate text-[15px] font-black", st.state === "fail" ? "text-bad" : "text-ink")}>
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
      <Panel>
        <EmptyState compact icon={<Icon.chat size={22} />} title="No respondió el onboarding" />
      </Panel>
    );
  const answers = sortQuestions(Object.entries(o.answers).map(([question, values]) => ({ question, values })));
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
                        {v}
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
        <Panel title="Privado" tone="sand">
          <ul className="space-y-2 text-[13.5px] font-medium text-ink-70">
            <li className="flex items-center gap-2">
              <Icon.lock size={14} />
              {o.hasExName ? "Escribió el nombre de su ex (no se muestra)." : "No escribió el nombre de su ex."}
            </li>
            <li className="flex items-center gap-2">
              <Icon.lock size={14} />
              {o.futureMessageLength
                ? `Escribió un mensaje para su yo del futuro (${n(o.futureMessageLength)} caracteres, no se muestra).`
                : "No escribió el mensaje para su yo del futuro."}
            </li>
            <li className="flex items-center gap-2">
              <Icon.check size={14} />
              {o.commitmentSignedAt
                ? `Firmó el compromiso el ${dayLong(ts(o.commitmentSignedAt))}.`
                : "No firmó el compromiso."}
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function ProgressTab({ u }: { u: UserDetail }) {
  const p = u.plan;
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
          <ul className="mt-4 max-h-[420px] divide-y divide-bo-line overflow-auto border-t border-bo-line">
            {[...u.challenges].reverse().map((c) => (
              <li key={`${c.challengeId}-${c.date}`} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-[54px] shrink-0 text-[12.5px] font-bold text-ink-60 tnum">Día {c.day}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink">{c.title}</span>
                <span className="shrink-0 text-[12.5px] font-medium text-ink-60">{dayShort(dayKey(c.date))}</span>
                {c.completed ? (
                  <Badge size="sm" tone="ok">
                    Completó
                  </Badge>
                ) : (
                  <Badge size="sm">Pendiente</Badge>
                )}
              </li>
            ))}
          </ul>
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
  return (
    <Panel pad={false} title="Leyó" sub={plural(u.resourceReads.length, "artículo o tip", "artículos y tips")}>
      {u.resourceReads.length ? (
        <ul className="mt-4 divide-y divide-bo-line border-t border-bo-line">
          {[...u.resourceReads]
            .sort((a, b) => ts(b.readAt) - ts(a.readAt))
            .map((r) => (
              <li key={`${r.resourceId}-${r.readAt}`} className="flex items-center gap-3 px-5 py-2.5">
                <Badge size="sm" tone={r.type === "Article" ? "info" : "lime"}>
                  {r.type === "Article" ? "Artículo" : "Tip"}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink">{r.title}</span>
                <span className="shrink-0 text-[12.5px] font-medium text-ink-60">{dateTime(ts(r.readAt))}</span>
              </li>
            ))}
        </ul>
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
        <p className="mt-4 flex items-center gap-2 text-[12.5px] font-medium text-[#4B48C9]">
          <Icon.lock size={14} /> La conversación es privada: solo mostramos cantidades.
        </p>
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
    </div>
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
      {c.posts + c.comments > 0 && (
        <Link
          href={`/moderation/community?user=${u.id}`}
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-purple hover:underline"
        >
          Ver lo que publicó en Moderación <Icon.arrowRight size={14} />
        </Link>
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
