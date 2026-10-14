"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/Field";
import { StatTile } from "@/components/ui/KpiCard";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Segmented, Tabs } from "@/components/ui/Tabs";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ago, dateTime, n, plural } from "@/lib/format";
import {
  useModerationComments,
  useModerationCounts,
  useModerationPosts,
  useModerationTotal,
  usePostComments,
  type ModerationListParams,
} from "@/lib/moderation/queries";
import type {
  ModerationComment,
  ModerationFlag,
  ModerationKind,
  ModerationPost,
  ModerationStatus,
} from "@/lib/moderation/types";
import { FLAG, reasonLabel } from "../_shared/labels";
import { displayName, Pager, useDebounced, useNow, UserAvatar } from "../_shared/ui";
import { useModeration } from "../_shared/useModeration";

/*
 * Moderation → Community. Three views as colored KPI tiles (Para revisar / Publicadas / Eliminadas), publications or
 * comments, search and an optional ?user=<userId> filter. "Para revisar" holds what was reported and what the AI
 * moderator flagged, in the server's order ("Posible riesgo" first). Removing asks first; restoring and "No infringe"
 * are immediate with a toast. Every action resolves the open reports and lands in the Historial.
 */

const PAGE_SIZE = 20;

export function CommunityView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const userId = params.get("user");
  const [status, setStatus] = useState<ModerationStatus>(userId ? "all" : "review");
  const [kind, setKind] = useState<ModerationKind>("posts");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const mod = useModeration();
  const now = useNow();

  const list: ModerationListParams = { status, search, userId, page, pageSize: PAGE_SIZE };
  const posts = useModerationPosts(list);
  const comments = useModerationComments(list);
  const query = kind === "posts" ? posts : comments;

  const reviewP = useModerationTotal("posts", "review", userId);
  const reviewC = useModerationTotal("comments", "review", userId);
  const allP = useModerationTotal("posts", "all", userId);
  const allC = useModerationTotal("comments", "all", userId);
  const delP = useModerationTotal("posts", "deleted", userId);
  const delC = useModerationTotal("comments", "deleted", userId);
  const sum = (a?: number, b?: number) => (a === undefined || b === undefined ? undefined : a + b);
  const reviewCount = sum(reviewP.data, reviewC.data);
  const deletedCount = sum(delP.data, delC.data);
  const fmt = (v?: number) => (v === undefined ? "—" : n(v));
  const counts = useModerationCounts().data;
  const atRisk = userId || !counts ? 0 : counts.postsAtRisk + counts.commentsAtRisk;

  const pick = (s: ModerationStatus) => {
    setStatus(s);
    setPage(1);
  };
  const clearUser = () => {
    const next = new URLSearchParams(params);
    next.delete("user");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setPage(1);
  };

  const authorName =
    userId &&
    displayName(
      [...(posts.data?.items ?? []), ...(comments.data?.items ?? [])].find((x) => x.author.id === userId)?.author ??
        null,
    );

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Comunidad"
        sub="Lo que elimines desaparece para todos. Se puede restaurar y queda en el Historial."
      />

      <div className="mb-6 hidden gap-3 sm:grid sm:grid-cols-3">
        <StatTile
          tone="peach"
          figure="halves"
          icon={<Icon.flag size={15} />}
          label="Para revisar"
          value={fmt(reviewCount)}
          extra={
            atRisk > 0 && (
              <Badge tone="bad" icon={<Icon.alert size={12} />}>
                {`${n(atRisk)} en riesgo`}
              </Badge>
            )
          }
          note={
            reviewP.data !== undefined && reviewC.data !== undefined
              ? `${plural(reviewP.data, "publicación", "publicaciones")} · ${plural(reviewC.data, "comentario", "comentarios")}`
              : "Reportes y alertas automáticas"
          }
          onClick={() => pick("review")}
          selected={status === "review"}
        />
        <StatTile
          tone="lilac"
          figure="circles"
          icon={<Icon.community size={15} />}
          label="Publicadas"
          value={fmt(allP.data)}
          note={allC.data !== undefined ? plural(allC.data, "comentario", "comentarios") : undefined}
          onClick={() => pick("all")}
          selected={status === "all"}
        />
        <StatTile
          tone="sand"
          figure="quarters"
          icon={<Icon.trash size={15} />}
          label="Eliminadas"
          value={fmt(deletedCount)}
          note="Se pueden restaurar"
          onClick={() => pick("deleted")}
          selected={status === "deleted"}
        />
      </div>
      {atRisk > 0 && status !== "deleted" && (
        <div className="mb-5 flex items-start gap-3 rounded-[16px] bg-bad-bg px-4 py-3.5 text-bad">
          <Icon.alert size={20} className="mt-0.5 shrink-0" />
          <p className="text-[14px] leading-[1.5] font-medium">
            <b className="font-bold">
              {atRisk === 1
                ? "1 publicación o comentario puede ser de alguien en riesgo."
                : `${n(atRisk)} publicaciones o comentarios pueden ser de alguien en riesgo.`}
            </b>{" "}
            Van primero en “Para revisar”.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 sm:hidden">
            <Tabs
              label="Qué mostrar"
              value={status}
              onChange={pick}
              items={[
                { id: "review", label: "Para revisar", count: reviewCount },
                { id: "all", label: "Publicadas" },
                { id: "deleted", label: "Eliminadas", count: deletedCount || undefined },
              ]}
            />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented
              label="Tipo de contenido"
              value={kind}
              onChange={(k) => {
                setKind(k);
                setPage(1);
              }}
              options={[
                { id: "posts", label: "Publicaciones" },
                { id: "comments", label: "Comentarios" },
              ]}
            />
            <SearchField
              label="Buscar en la comunidad"
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Buscar texto, nombre o email"
              className="w-full sm:ml-auto sm:w-[320px]"
            />
          </div>
          {userId && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-[30px] items-center gap-1 rounded-full bg-purple-10 pr-1 pl-3 text-[13px] font-bold text-info">
                Solo de {authorName && authorName !== "Cuenta eliminada" ? authorName : "esta persona"}
                <button
                  type="button"
                  aria-label="Quitar filtro"
                  onClick={clearUser}
                  className="flex h-[24px] w-[24px] press items-center justify-center rounded-full hover:bg-purple-20"
                >
                  <Icon.x size={13} />
                </button>
              </span>
            </div>
          )}

          {query.isPending ? (
            <ul className="space-y-3" aria-busy="true" aria-label="Cargando">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[160px] rounded-[16px]" />
              ))}
            </ul>
          ) : query.isError ? (
            <Panel>
              <EmptyState
                icon={<Icon.alert size={22} />}
                title="No pudimos cargar la comunidad"
                text={describeError(query.error)}
                action={<Button onClick={() => query.refetch()}>Reintentar</Button>}
              />
            </Panel>
          ) : items.length ? (
            <>
              <ul className={cx("space-y-3 transition-opacity", query.isPlaceholderData && "opacity-60")}>
                {kind === "posts"
                  ? (items as ModerationPost[]).map((p) => (
                      <li key={p.id}>
                        <ItemCard kind="posts" item={p} mod={mod} now={now} />
                      </li>
                    ))
                  : (items as ModerationComment[]).map((c) => (
                      <li key={c.id}>
                        <ItemCard kind="comments" item={c} mod={mod} now={now} />
                      </li>
                    ))}
              </ul>
              <Pager
                page={page}
                totalPages={query.data?.totalPages ?? 1}
                totalCount={query.data?.totalCount ?? 0}
                onPage={setPage}
                busy={query.isFetching}
              />
            </>
          ) : (
            <Panel>
              <EmptyState
                icon={status === "review" ? <Icon.check size={22} /> : <Icon.community size={22} />}
                title={
                  search
                    ? "Nada coincide con la búsqueda"
                    : status === "review"
                      ? "No hay nada para revisar"
                      : status === "deleted"
                        ? "No hay nada eliminado"
                        : kind === "posts"
                          ? "No hay publicaciones"
                          : "No hay comentarios"
                }
                text={
                  search
                    ? "Probá con otra palabra, un nombre o un email."
                    : status === "review"
                      ? "Cuando alguien reporte algo o una publicación dispare una alerta, aparece acá."
                      : undefined
                }
              />
            </Panel>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <Panel title="Cómo moderar">
            <ul className="space-y-2.5 text-[13px] leading-[1.5] font-medium text-ink-70">
              <li>
                <b className="font-bold text-ink">Eliminar</b> la saca de la comunidad para todos y resuelve sus
                reportes.
              </li>
              <li>
                <b className="font-bold text-ink">No infringe</b> resuelve los reportes y la alerta, y la deja
                publicada.
              </li>
              <li>
                <b className="font-bold text-ink">Cambiar nombre</b> cambia cómo se ve esa persona en la comunidad.
              </li>
              <li>
                Las publicaciones “anónimas” se ven anónimas en la app; acá se ve quién las escribió para poder moderar.
              </li>
            </ul>
          </Panel>
          <Panel
            title="Alertas automáticas"
            sub="Al publicar, una IA lee cada texto: lo grave no se publica y lo dudoso se publica con una alerta para que lo mires. No borra nada sola."
          >
            <ul className="space-y-3">
              {(Object.keys(FLAG) as ModerationFlag[]).map((f) => (
                <li key={f}>
                  <Badge tone={FLAG[f].tone} size="sm">
                    {FLAG[f].label}
                  </Badge>
                  <p className="mt-1 text-[12.5px] leading-[1.45] font-medium text-ink-60">{FLAG[f].help}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
      {mod.dialogs}
    </>
  );
}

type Mod = ReturnType<typeof useModeration>;

function ItemCard(
  props:
    | { kind: "posts"; item: ModerationPost; mod: Mod; now: number }
    | { kind: "comments"; item: ModerationComment; mod: Mod; now: number },
) {
  const { kind, item, mod, now } = props;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const removed = !!item.removedAt;
  const reported = !removed && item.openReports > 0;
  const flagged = !removed && !!item.flag && !item.reviewedAt;
  const pending = reported || flagged;
  const target = { kind, id: item.id };
  const profile = `/tracking/users/${item.author.id}`;
  const openReasons = item.reportsDetail.filter((r) => r.status !== "Resolved");
  const reasons = [...new Set((openReasons.length ? openReasons : item.reportsDetail).map((r) => r.reason))];
  const details = openReasons.map((r) => r.details?.trim()).filter(Boolean) as string[];

  const menu: MenuItem[] = [
    ...(pending ? [{ label: "No infringe", icon: <Icon.check size={17} />, onClick: () => mod.dismiss(target) }] : []),
    ...(kind === "comments" && !removed
      ? [
          {
            label: "Eliminar comentario",
            icon: <Icon.trash size={17} />,
            danger: true,
            onClick: () => mod.askRemove(target),
          },
        ]
      : []),
    {
      label: "Cambiar nombre",
      icon: <Icon.pencil size={17} />,
      onClick: () => mod.openRename({ id: item.author.id, name: item.author.name }),
    },
    { label: "Ver perfil", icon: <Icon.users size={17} />, onClick: () => router.push(profile) },
  ];

  return (
    <article
      className={cx(
        "rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgba(36,35,35,0.04),0_4px_14px_rgba(36,35,35,0.05)] sm:p-5",
        removed && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar id={item.author.id} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link href={profile} className="truncate text-[14px] font-bold text-ink hover:text-purple">
                {displayName(item.author)}
              </Link>
              {kind === "posts" && props.item.isAnonymous && <Badge size="sm">Publicó como anónimo</Badge>}
            </p>
            <p className="w-fit text-[12px] font-medium text-ink-60" title={dateTime(Date.parse(item.createdAt))}>
              {item.author.email} · {ago(Date.parse(item.createdAt), now)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {removed ? (
            <Button size="sm" icon={<Icon.undo size={15} />} onClick={() => mod.restore(target)}>
              Restaurar
            </Button>
          ) : (
            <>
              {pending && (
                <Button
                  size="sm"
                  icon={<Icon.check size={15} />}
                  onClick={() => mod.dismiss(target)}
                  className="hidden sm:inline-flex"
                >
                  No infringe
                </Button>
              )}
              {kind === "posts" && (
                <Button
                  size="sm"
                  variant="dangerSoft"
                  icon={<Icon.trash size={15} />}
                  onClick={() => mod.askRemove(target)}
                  aria-label="Eliminar publicación"
                >
                  <span className="hidden sm:inline">Eliminar</span>
                </Button>
              )}
            </>
          )}
          <Menu label={kind === "posts" ? "Acciones de la publicación" : "Acciones del comentario"} items={menu} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {removed && (
          <Badge tone="bad" size="sm" icon={<Icon.trash size={12} />}>
            {`${kind === "posts" ? "Eliminada" : "Eliminado"} ${ago(Date.parse(item.removedAt!), now).toLowerCase()}`}
          </Badge>
        )}
        {item.flag && !removed && <FlagBadge flag={item.flag} />}
        {reported && (
          <Badge size="sm" tone="warn" icon={<Icon.flag size={12} />}>
            {plural(item.openReports, "reporte", "reportes")}
          </Badge>
        )}
        {reported &&
          reasons.map((r) => (
            <Badge key={r} size="sm" tone={r === "SelfHarm" ? "bad" : "neutral"}>
              {reasonLabel(r)!}
            </Badge>
          ))}
        {!pending && !removed && item.reviewedAt && (
          <Badge size="sm" tone="ok" icon={<Icon.check size={12} />}>
            Revisado: no infringe
          </Badge>
        )}
      </div>

      {kind === "comments" && (
        <p className="mt-2.5 line-clamp-2 text-[12.5px] font-medium text-ink-60">
          {`En la publicación: “${props.item.postText}”`}
        </p>
      )}
      <p
        className={cx(
          "mt-2 text-[15px] leading-[1.5] font-medium whitespace-pre-line text-ink",
          removed && "line-through decoration-ink/30",
        )}
      >
        {item.text}
      </p>
      {removed && item.removalReason && (
        <p className="mt-2 text-[12.5px] font-medium text-ink-60">Motivo: {item.removalReason}</p>
      )}
      {flagged && item.flag === "SelfHarm" ? (
        <p className="mt-3 rounded-[12px] bg-bad-bg px-3.5 py-2.5 text-[13px] leading-[1.5] font-medium text-bad">
          <b className="font-bold">Posible riesgo.</b> {FLAG.SelfHarm.help}
        </p>
      ) : (
        reported &&
        reasons.includes("SelfHarm") && (
          <p className="mt-3 rounded-[12px] bg-bad-bg px-3.5 py-2.5 text-[13px] leading-[1.5] font-medium text-bad">
            <b className="font-bold">Reportada por autolesión.</b> No la borres sin revisar: conviene escribirle a la
            persona con recursos de ayuda.
          </p>
        )
      )}
      {details.length > 0 && (
        <ul className="mt-3 space-y-1">
          {details.slice(0, 3).map((d, i) => (
            <li key={i} className="text-[13px] font-medium text-ink-70">
              <span className="font-bold text-ink-60">Quien reportó: </span>“{d}”
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[13px] font-bold text-ink-60">
        <span className="inline-flex items-center gap-1.5">
          <Icon.heart size={16} />
          {n(item.likes)}
        </span>
        {kind === "posts" &&
          (props.item.comments ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex press items-center gap-1.5 rounded-[8px] hover:text-purple"
            >
              <Icon.chat size={16} />
              {plural(props.item.comments, "comentario", "comentarios")}
              <Icon.chevronDown size={14} className={cx("transition-transform", open && "rotate-180")} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Icon.chat size={16} />
              Sin comentarios
            </span>
          ))}
        {item.reports > 0 && !reported && (
          <span className="inline-flex items-center gap-1.5">
            <Icon.flag size={16} />
            {plural(item.reports, "reporte", "reportes")} (resueltos)
          </span>
        )}
      </div>
      {kind === "posts" && open && <PostThread postId={item.id} mod={mod} now={now} />}
    </article>
  );
}

/* Every comment of a post (removed ones too), oldest first, with remove / restore. */
function PostThread({ postId, mod, now }: { postId: string; mod: Mod; now: number }) {
  const q = usePostComments(postId, true);
  const comments = [...(q.data?.items ?? [])].reverse();
  return (
    <div className="mt-3 rounded-[14px] bg-bo-soft p-3 shadow-[inset_0_0_0_1px_#EFEDE7]">
      {q.isPending ? (
        <Skeleton className="h-[48px] rounded-[10px]" />
      ) : q.isError ? (
        <p className="text-[13px] font-medium text-bad">{describeError(q.error)}</p>
      ) : comments.length ? (
        <ul className="divide-y divide-bo-line">
          {comments.map((c) => {
            const removed = !!c.removedAt;
            const target = { kind: "comments" as const, id: c.id };
            return (
              <li key={c.id} className="flex items-start gap-2.5 py-2.5">
                <UserAvatar id={c.author.id} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink-60">
                    <Link href={`/tracking/users/${c.author.id}`} className="font-bold text-ink hover:text-purple">
                      {displayName(c.author)}
                    </Link>
                    {` · ${ago(Date.parse(c.createdAt), now)}`}
                    {c.openReports > 0 && !removed && ` · ${plural(c.openReports, "reporte", "reportes")}`}
                  </p>
                  {c.flag && !removed && (
                    <div className="mt-1">
                      <FlagBadge flag={c.flag} />
                    </div>
                  )}
                  <p
                    className={cx(
                      "mt-0.5 text-[14px] leading-[1.45] font-medium whitespace-pre-line text-ink",
                      removed && "line-through decoration-ink/30 opacity-70",
                    )}
                  >
                    {c.text}
                  </p>
                </div>
                {removed ? (
                  <Button size="sm" icon={<Icon.undo size={14} />} onClick={() => mod.restore(target)}>
                    Restaurar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="dangerSoft"
                    icon={<Icon.trash size={14} />}
                    onClick={() => mod.askRemove(target)}
                    aria-label="Eliminar comentario"
                  >
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] font-medium text-ink-60">Sin comentarios.</p>
      )}
    </div>
  );
}

function FlagBadge({ flag }: { flag: ModerationFlag }) {
  return (
    <Badge size="sm" tone={FLAG[flag].tone} icon={<Icon.alert size={12} />}>
      {FLAG[flag].label}
    </Badge>
  );
}
