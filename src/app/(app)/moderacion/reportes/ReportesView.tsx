"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { HScroll } from "@/components/ui/HScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Segmented, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ago, dateTime, n, plural } from "@/lib/format";
import { useSetInboxStatus } from "@/lib/moderacion/mutations";
import { useInbox, useInboxTotal } from "@/lib/moderacion/queries";
import type { InboxItem, InboxStatus, InboxType } from "@/lib/moderacion/types";
import { TONE } from "@/lib/tones";
import { reasonLabel, STATUS, TYPE, TYPES } from "../_shared/labels";
import { displayName, Pager, useDebounced, useNow } from "../_shared/ui";
import { useModeration } from "../_shared/useModeration";

/*
 * Moderación → Reportes y feedback. One inbox: community reports plus the app's feedback (bugs, suggestions, other,
 * cancellation and account deletion reasons). Each item goes Nuevo → En revisión → Resuelto. Removing or marking
 * "No infringe" from a report resolves it on the server. On phones the detail opens in a drawer.
 */

type StatusF = InboxStatus | "all";
type TypeF = InboxType | "all";
const PAGE_SIZE = 30;

const TYPE_ICON: Record<InboxType, (p: { size?: number }) => ReactNode> = {
  report: Icon.flag,
  bug: Icon.bug,
  suggestion: Icon.bulb,
  other: Icon.chat,
  subscriptionCancellation: Icon.card,
  accountDeletion: Icon.door,
};
const typeColors = (t: InboxType) => {
  const look = TYPE[t].look;
  return { background: TONE[look].bg, color: look === "lime" || look === "sand" ? TONE[look].ink : TONE[look].sub };
};

const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

export function ReportesView() {
  const [status, setStatus] = useState<StatusF>("New");
  const [type, setType] = useState<TypeF>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selId, setSelId] = useState<string | null>(null);
  const search = useDebounced(q);
  const wide = useWide();
  const now = useNow();

  const st = status === "all" ? null : status;
  const inbox = useInbox({ status: st, type: type === "all" ? null : type, search, page, pageSize: PAGE_SIZE });
  const cNew = useInboxTotal("New", null);
  const cRev = useInboxTotal("InReview", null);
  const cRes = useInboxTotal("Resolved", null);
  const cAll = useInboxTotal(null, null);
  /* One small count per type for the current status tab (types with nothing are hidden). */
  const typeCounts = {
    report: useInboxTotal(st, "report").data,
    bug: useInboxTotal(st, "bug").data,
    suggestion: useInboxTotal(st, "suggestion").data,
    other: useInboxTotal(st, "other").data,
    subscriptionCancellation: useInboxTotal(st, "subscriptionCancellation").data,
    accountDeletion: useInboxTotal(st, "accountDeletion").data,
  } satisfies Record<InboxType, number | undefined>;
  const statusTotal = { New: cNew.data, InReview: cRev.data, Resolved: cRes.data, all: cAll.data }[status];

  const items = inbox.data?.items ?? [];
  /* On desktop the first item is shown when nothing is picked. */
  const sel = items.find((i) => i.id === selId) ?? (wide ? (items[0] ?? null) : null);
  const reset = () => {
    setPage(1);
    setSelId(null);
  };

  return (
    <>
      <PageHeader title="Reportes y feedback" sub="Todo lo que mandan los usuarios, en un solo lugar." />
      <div className="mb-4">
        <Tabs
          label="Estado"
          value={status}
          onChange={(v) => {
            setStatus(v);
            reset();
          }}
          items={[
            { id: "New", label: "Nuevos", count: cNew.data },
            { id: "InReview", label: "En revisión", count: cRev.data },
            { id: "Resolved", label: "Resueltos", count: cRes.data },
            { id: "all", label: "Todos", count: cAll.data },
          ]}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <HScroll
          label="Tipos"
          arrows={false}
          fade="#F5F3EE"
          className="-mx-1 min-w-[220px] flex-1"
          innerClassName="no-scrollbar px-1 py-0.5"
        >
          <div className="flex w-max gap-1.5">
            {(["all", ...TYPES] as TypeF[]).map((t) => {
              const on = type === t;
              const c = t === "all" ? statusTotal : typeCounts[t];
              if (t !== "all" && !on && !c) return null;
              const TIcon = t === "all" ? null : TYPE_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setType(t);
                    reset();
                  }}
                  className={cx(
                    "inline-flex h-[34px] shrink-0 press items-center gap-1.5 rounded-full text-[13px] font-bold",
                    t === "all" ? "px-3.5" : "pr-3.5 pl-1.5",
                    on ? "bg-ink text-white" : "bg-white text-ink-70 shadow-[inset_0_0_0_1px_#E3E0D9] hover:text-ink",
                  )}
                >
                  {t !== "all" && TIcon && (
                    <span
                      className="flex h-[24px] w-[24px] items-center justify-center rounded-full"
                      style={typeColors(t)}
                    >
                      <TIcon size={13} />
                    </span>
                  )}
                  {t === "all" ? "Todo" : TYPE[t].label}
                  {c !== undefined && <span className="tnum opacity-70">{n(c)}</span>}
                </button>
              );
            })}
          </div>
        </HScroll>
        <SearchField
          label="Buscar en el inbox"
          value={q}
          onChange={(v) => {
            setQ(v);
            reset();
          }}
          placeholder="Buscar texto, nombre o email"
          className="w-full sm:w-[260px]"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="min-w-0 self-start">
          <Panel pad={false} className="overflow-hidden">
            {inbox.isPending ? (
              <div className="space-y-2 p-4" aria-busy="true" aria-label="Cargando">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[72px] rounded-[12px]" />
                ))}
              </div>
            ) : inbox.isError ? (
              <EmptyState
                icon={<Icon.alert size={22} />}
                title="No pudimos cargar el inbox"
                text={describeError(inbox.error)}
                action={<Button onClick={() => inbox.refetch()}>Reintentar</Button>}
              />
            ) : items.length ? (
              <ul className={cx("divide-y divide-bo-line transition-opacity", inbox.isPlaceholderData && "opacity-60")}>
                {items.map((i) => (
                  <li key={i.id}>
                    <Row item={i} on={i.id === sel?.id} onClick={() => setSelId(i.id)} now={now} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Icon.check size={22} />}
                title={search ? "Nada coincide con la búsqueda" : status === "New" ? "Estás al día" : "No hay nada acá"}
                text={
                  search
                    ? "Probá con otra palabra, un nombre o un email."
                    : status === "New"
                      ? "No hay ítems nuevos con estos filtros."
                      : "Probá con otro estado o tipo."
                }
              />
            )}
          </Panel>
          <Pager
            page={page}
            totalPages={inbox.data?.totalPages ?? 1}
            totalCount={inbox.data?.totalCount ?? 0}
            onPage={(p) => {
              setPage(p);
              setSelId(null);
            }}
            busy={inbox.isFetching}
          />
        </div>

        {wide ? (
          <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            {sel ? (
              <Detail key={sel.id} item={sel} now={now} />
            ) : (
              <Panel>
                <EmptyState title="Elegí un ítem" text="Su detalle aparece acá." icon={<Icon.inbox size={22} />} />
              </Panel>
            )}
          </div>
        ) : (
          <Drawer
            open={!!sel}
            onClose={() => setSelId(null)}
            title={sel ? TYPE[sel.type].label : ""}
            sub={sel ? dateTime(Date.parse(sel.at)) : undefined}
          >
            {sel && <Detail key={sel.id} item={sel} now={now} bare />}
          </Drawer>
        )}
      </div>
    </>
  );
}

function Row({ item, on, onClick, now }: { item: InboxItem; on: boolean; onClick: () => void; now: number }) {
  const TIcon = TYPE_ICON[item.type];
  const preview =
    item.type === "report"
      ? item.target
        ? `“${item.target.text}”`
        : "Contenido no disponible"
      : item.message || "Sin mensaje";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "true" : undefined}
      className={cx(
        "flex w-full gap-3 px-4 py-3.5 text-left transition-colors",
        on ? "bg-purple-10" : "hover:bg-bo-soft",
      )}
    >
      <span
        className="mt-0.5 flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px]"
        style={typeColors(item.type)}
      >
        <TIcon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-bold text-ink">
            {TYPE[item.type].label}
            {item.type === "report" && item.reason
              ? ` · ${reasonLabel(item.reason)}`
              : item.section
                ? ` · ${item.section}`
                : ""}
          </span>
          {item.status === "New" && (
            <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-purple" aria-label="Nuevo" />
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.4] font-medium text-ink-70">{preview}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-ink-60">
          {item.user ? displayName(item.user) : item.source === "feedback" ? "Anónimo" : "Cuenta eliminada"} ·{" "}
          {ago(Date.parse(item.at), now)}
          {item.reason === "SelfHarm" && (
            <Badge size="sm" tone="bad">
              Autolesión
            </Badge>
          )}
          {item.target && item.target.reports > 1 && (
            <Badge size="sm" tone="warn">
              {`${n(item.target.reports)} reportes`}
            </Badge>
          )}
        </span>
      </span>
    </button>
  );
}

function Detail({ item, now, bare = false }: { item: InboxItem; now: number; bare?: boolean }) {
  const toast = useToast();
  const setInbox = useSetInboxStatus();
  const mod = useModeration();
  const TIcon = TYPE_ICON[item.type];
  const t = item.target;
  const modTarget = t
    ? { kind: t.kind === "post" ? ("posts" as const) : ("comments" as const), id: t.commentId ?? t.postId }
    : null;

  const changeStatus = (s: InboxStatus) => {
    if (s === item.status) return;
    const prev = item.status;
    const key = { source: item.source, id: item.id };
    setInbox
      .mutateAsync({ ...key, status: s })
      .then(() =>
        toast({
          text: `Marcado como ${STATUS[s].label.toLowerCase()}`,
          tone: "ok",
          undo: () =>
            setInbox.mutateAsync({ ...key, status: prev }).catch((e) => toast({ text: describeError(e), tone: "bad" })),
        }),
      )
      .catch((e) => toast({ text: describeError(e), tone: "bad" }));
  };

  const body = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-[28px] items-center gap-1.5 rounded-full pr-3 pl-2 text-[13px] font-bold"
            style={typeColors(item.type)}
          >
            <TIcon size={14} />
            {TYPE[item.type].label}
          </span>
          {item.reason && (
            <Badge tone={item.reason === "SelfHarm" ? "bad" : "neutral"}>{reasonLabel(item.reason)!}</Badge>
          )}
          {item.section && <Badge>{`Dónde: ${item.section}`}</Badge>}
        </div>
        <Segmented
          label="Estado"
          size="sm"
          value={item.status}
          onChange={changeStatus}
          options={(Object.keys(STATUS) as InboxStatus[]).map((s) => ({ id: s, label: STATUS[s].label }))}
        />
      </div>

      {item.type === "report" ? (
        t ? (
          <div>
            <p className="text-[12.5px] font-bold text-ink-60">
              {t.kind === "comment" ? "Comentario reportado" : "Publicación reportada"} ·{" "}
              {plural(t.reports, "reporte", "reportes")}
            </p>
            <div
              className={cx(
                "mt-2 rounded-[14px] bg-bo-soft p-4 shadow-[inset_0_0_0_1px_#EFEDE7]",
                t.removed && "opacity-70",
              )}
            >
              <p
                className={cx(
                  "text-[15px] leading-[1.5] font-medium whitespace-pre-line text-ink",
                  t.removed && "line-through decoration-ink/30",
                )}
              >
                {t.text}
              </p>
              {t.removed && (
                <p className="mt-3">
                  <Badge size="sm" tone="bad">
                    Ya eliminado
                  </Badge>
                </p>
              )}
            </div>
            {item.message && (
              <p className="mt-3 text-[13.5px] font-medium text-ink-70">
                <span className="font-bold text-ink-60">Detalle de quien reportó: </span>“{item.message}”
              </p>
            )}
            {item.reason === "SelfHarm" && !t.removed && (
              <p className="mt-3 rounded-[12px] bg-bad-bg px-3.5 py-2.5 text-[13px] leading-[1.5] font-medium text-bad">
                No lo borres sin revisar: conviene escribirle a la persona con recursos de ayuda.
              </p>
            )}
            {modTarget && (
              <div className="mt-3 flex flex-wrap gap-2">
                {t.removed ? (
                  <Button size="sm" icon={<Icon.undo size={15} />} onClick={() => mod.restore(modTarget)}>
                    Restaurar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Icon.trash size={15} />}
                      onClick={() => mod.askRemove(modTarget)}
                    >
                      {t.kind === "comment" ? "Eliminar comentario" : "Eliminar publicación"}
                    </Button>
                    {item.status !== "Resolved" && (
                      <Button size="sm" icon={<Icon.check size={15} />} onClick={() => mod.dismiss(modTarget)}>
                        No infringe
                      </Button>
                    )}
                  </>
                )}
                <Link
                  href={`/moderacion/comunidad?u=${t.authorId}`}
                  className="inline-flex h-[34px] press items-center rounded-[10px] px-3 text-[13px] font-bold text-ink-70 hover:bg-bo-soft hover:text-ink"
                >
                  Ver en Comunidad
                </Link>
                <Link
                  href={`/trackeo/usuarios/${t.authorId}`}
                  className="inline-flex h-[34px] press items-center rounded-[10px] px-3 text-[13px] font-bold text-ink-70 hover:bg-bo-soft hover:text-ink"
                >
                  Perfil del autor
                </Link>
              </div>
            )}
            <p className="mt-3 text-[12.5px] font-medium text-ink-60">
              Eliminar o marcar “No infringe” resuelve todos los reportes de ese contenido.
            </p>
          </div>
        ) : (
          <EmptyState compact title="El contenido ya no existe" />
        )
      ) : (
        <blockquote className="rounded-[14px] bg-bo-soft p-4 text-[16px] leading-[1.5] font-medium whitespace-pre-line text-ink shadow-[inset_0_0_0_1px_#EFEDE7]">
          {item.message ? (
            item.type === "subscriptionCancellation" || item.type === "accountDeletion" ? (
              item.message
            ) : (
              `“${item.message}”`
            )
          ) : (
            <span className="text-ink-60">No escribió un mensaje.</span>
          )}
        </blockquote>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-bo-line pt-4 sm:grid-cols-3">
        <Meta label={item.type === "report" ? "Quién reportó" : "Quién"}>
          {item.user ? (
            <Link href={`/trackeo/usuarios/${item.user.id}`} className="font-bold text-purple hover:underline">
              {displayName(item.user)}
            </Link>
          ) : item.source === "feedback" ? (
            "Anónimo"
          ) : (
            "Cuenta eliminada"
          )}
        </Meta>
        <Meta label="Cuándo">{`${dateTime(Date.parse(item.at))} · ${ago(Date.parse(item.at), now).toLowerCase()}`}</Meta>
        {item.source === "feedback" && (
          <>
            <Meta label="App">{item.appVersion ? `v${item.appVersion}` : "—"}</Meta>
            <Meta label="Teléfono">{item.device ?? "—"}</Meta>
            <Meta label="Idioma">{item.locale ?? "—"}</Meta>
          </>
        )}
      </dl>

      {item.source === "feedback" && (item.type === "bug" || item.type === "suggestion" || item.type === "other") && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-bo-soft px-4 py-3 shadow-[inset_0_0_0_1px_#EFEDE7]">
          <Icon.mail size={18} />
          <p className="min-w-0 flex-1 text-[13px] font-medium text-ink-70">
            {item.contactOk ? "Aceptó que le escriban para pedir más detalles." : "No quiere que le escriban."}
          </p>
          {item.contactOk && item.user?.email && (
            <a
              href={`mailto:${item.user.email}?subject=${encodeURIComponent("Sobre lo que nos contaste en Over It")}`}
              className="inline-flex h-[32px] press items-center gap-1.5 rounded-[10px] bg-purple px-3 text-[13px] font-bold text-white"
            >
              Escribirle
            </a>
          )}
        </div>
      )}
      {item.type === "subscriptionCancellation" && item.user && (
        <Link
          href={`/trackeo/usuarios/${item.user.id}`}
          className="inline-flex h-[34px] press items-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-bold text-ink shadow-[inset_0_0_0_1px_#E3E0D9]"
        >
          <Icon.card size={15} />
          Ver su suscripción
        </Link>
      )}
      {item.type === "accountDeletion" && (
        <p className="text-[13px] leading-[1.5] font-medium text-ink-60">
          La cuenta y sus datos se borraron: solo queda el motivo.
        </p>
      )}
    </div>
  );

  return (
    <>
      {bare ? (
        body
      ) : (
        <Panel title={TYPE[item.type].label} sub={dateTime(Date.parse(item.at))}>
          {body}
        </Panel>
      )}
      {mod.dialogs}
    </>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-bold text-ink-60">{label}</dt>
      <dd className="mt-0.5 truncate text-[13.5px] font-bold text-ink">{children}</dd>
    </div>
  );
}
