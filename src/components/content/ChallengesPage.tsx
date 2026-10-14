"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Info, Panel } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Stepper, TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { StatTile } from "@/components/ui/KpiCard";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { RAMP, RampLegend } from "@/components/ui/charts";
import { ApiError, describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { n, plural } from "@/lib/format";
import {
  toInput,
  useCreateContent,
  useDeleteContent,
  useReorderContent,
  useUpdateContent,
} from "@/lib/content/mutations";
import { useContentList } from "@/lib/content/queries";
import {
  PATH_DAYS,
  STRETCH,
  type Challenge,
  type ChallengeInput,
  type ChallengeType,
  type ContentStatus,
} from "@/lib/content/types";
import { EditorDrawer } from "./EditorDrawer";
import { useContentLanguage } from "./language";
import { ChallengePreview } from "./previews";
import { ContentToolbar, FieldError, ListError, ListSkeleton, short, StatusToggle, type StatusView } from "./shared";
import { flashRow, moveIndex, useDragReorder } from "./useDragReorder";

/*
 * Content → Challenges. The day of a challenge is its place among the published ones (the first is day 1); the
 * server recomputes `day` after every change. Drafts are not shown in the app and take no day: they show the day they
 * would get if published. Moving, deleting or publishing shifts the others, and the screen says which days shift
 * before it happens.
 */

type Row = { item: Challenge; index: number; day: number; published: boolean };

/** Day of each challenge for a given order (drafts: the day they would take if published). */
function withDays(list: Challenge[]): Row[] {
  let d = 0;
  return list.map((item, index) => {
    const published = item.status === "Published";
    if (published) d++;
    return { item, index, day: published ? d : d + 1, published };
  });
}
/** Ids with `id` placed so it becomes day `day` (before the one that is that day today); past the end, last. */
function placeAt(list: Challenge[], id: string, day: number): string[] {
  const rest = list.filter((x) => x.id !== id);
  let seen = 0;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].status !== "Published") continue;
    if (++seen === day) return [...rest.slice(0, i).map((x) => x.id), id, ...rest.slice(i).map((x) => x.id)];
  }
  return [...rest.map((x) => x.id), id];
}
/** 0-based list index for a new challenge that should be day `day`; undefined = at the end. */
function positionForDay(list: Challenge[], day: number): number | undefined {
  let seen = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].status === "Published" && ++seen === day) return i;
  }
  return undefined;
}
const STRETCHES = PATH_DAYS / STRETCH;
const stretchLabel = (k: number) =>
  k > STRETCHES ? `Después del día ${PATH_DAYS}` : `Días ${(k - 1) * STRETCH + 1} a ${k * STRETCH}`;
const daysText = (from: number, to: number) =>
  from === to ? `el día ${from}` : to - from === 1 ? `los días ${from} y ${to}` : `del día ${from} al ${to}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function ChallengesPage() {
  const [lang] = useContentLanguage();
  const query = useContentList("challenges", lang);
  const list = query.data ?? [];
  const toast = useToast();
  const create = useCreateContent("challenges");
  const update = useUpdateContent("challenges");
  const remove = useDeleteContent("challenges");
  const reorderM = useReorderContent("challenges");
  const [q, setQ] = useState("");
  const [view, setView] = useState<StatusView>("all");
  const [editing, setEditing] = useState<{ item: Challenge | null } | null>(null);
  const [newDay, setNewDay] = useState(1);
  const [del, setDel] = useState<Challenge | null>(null);
  const [inUse, setInUse] = useState<Challenge | null>(null);
  const [moving, setMoving] = useState<{ item: Challenge; day: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fail = (e: unknown) => toast({ text: describeError(e), tone: "bad" });

  const text = q.trim().toLowerCase();
  const canReorder = !text && view === "all";
  const rowsNow = withDays(list);
  const rowOf = (id: string) => rowsNow.find((r) => r.item.id === id);
  const published = rowsNow.filter((r) => r.published).length;
  const drafts = list.length - published;
  const missing = Math.max(0, PATH_DAYS - published);
  const extra = Math.max(0, published - PATH_DAYS);
  const onPath = list.reduce((a, x) => a + (x.status === "Published" ? x.activeUsersToday : 0), 0);
  const external = list.filter((x) => x.status === "Published" && x.type === "External").length;
  const maxToday = Math.max(1, ...list.map((x) => x.activeUsersToday));

  /* ═══ Order ═══ */
  const reorder = (item: Challenge, ids: string[]) => {
    const before = list.map((x) => x.id);
    if (before.join() === ids.join()) return;
    const was = rowOf(item.id);
    const next = withDays(ids.map((id) => list.find((x) => x.id === id)!));
    const now = next.find((r) => r.item.id === item.id)!;
    reorderM.mutate(
      { language: lang, ids },
      {
        onSuccess: () =>
          toast({
            text: was?.published ? `Movido al día ${now.day}` : `Borrador movido (quedaría en el día ${now.day})`,
            undo: () => reorderM.mutate({ language: lang, ids: before }, { onError: fail }),
          }),
        onError: fail,
      },
    );
  };
  const moveBy = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    reorder(
      list[from],
      moveIndex(
        list.map((x) => x.id),
        from,
        to,
      ),
    );
  };
  const dnd = useDragReorder({ count: list.length, enabled: canReorder, listRef, onMove: moveBy });
  const rows = withDays(dnd.preview(list));
  const shown = rows.filter(
    (r) =>
      (view === "all" || r.item.status === view) &&
      (!text ||
        `${r.item.title} ${r.item.action} ${(r.item.inputDefinitions ?? []).map((d) => d.label).join(" ")}`
          .toLowerCase()
          .includes(text)),
  );

  /* ═══ Status, duplicate, delete ═══ */
  const setStatus = (item: Challenge, status: ContentStatus) => {
    const before = toInput("challenges", item);
    update.mutate(
      { id: item.id, input: { ...before, status } },
      {
        onSuccess: () => {
          const day = withDays(list.map((x) => (x.id === item.id ? { ...x, status } : x))).find(
            (r) => r.item.id === item.id,
          )!.day;
          toast({
            text:
              status === "Published"
                ? `Publicado: es el día ${day} y los siguientes se corrieron uno`
                : "Pasó a borrador: los días siguientes se corrieron uno",
            undo: () => update.mutate({ id: item.id, input: before }, { onError: fail }),
          });
        },
        onError: fail,
      },
    );
  };
  const duplicate = (item: Challenge) => {
    const index = list.findIndex((x) => x.id === item.id);
    create.mutate(
      {
        ...toInput("challenges", item),
        title: `${item.title} (copia)`.slice(0, 200),
        status: "Draft",
        language: item.language,
        position: index + 1,
        inputDefinitions:
          item.type === "InApp" ? (item.inputDefinitions ?? []).map((d) => ({ label: d.label })) : undefined,
      },
      {
        onSuccess: ({ id }) => {
          toast({
            text: "Copia creada como borrador, debajo del original",
            undo: () => remove.mutate(id, { onError: fail }),
          });
          flashRow(`reto-${id}`);
        },
        onError: fail,
      },
    );
  };
  const onDelete = (item: Challenge) => {
    const index = list.findIndex((x) => x.id === item.id);
    const r = rowOf(item.id);
    remove.mutate(item.id, {
      onSuccess: () => {
        setDel(null);
        setEditing(null);
        toast({
          text: r?.published ? "Borrado: los días siguientes se corrieron uno" : "Borrador borrado",
          undo: () =>
            create.mutate(
              { ...toInput("challenges", item), language: item.language, position: index },
              { onError: fail },
            ),
        });
      },
      onError: (e) => {
        setDel(null);
        if (e instanceof ApiError && e.errorCode === "DASHBOARD_CHALLENGE_IN_USE") setInUse(item);
        else fail(e);
      },
    });
  };

  /* ═══ Save from the editor ═══ */
  const onSave = async (input: ChallengeInput, item: Challenge | null) => {
    if (!item) {
      const position = positionForDay(list, newDay);
      const { id } = await create.mutateAsync({ ...input, language: lang, position });
      setEditing(null);
      toast({
        text:
          input.status === "Published"
            ? `Creado: es el día ${Math.min(newDay, published + 1)}`
            : "Creado como borrador",
        undo: () => remove.mutate(id, { onError: fail }),
      });
      flashRow(`reto-${id}`);
      return;
    }
    const before = toInput("challenges", item);
    await update.mutateAsync({ id: item.id, input });
    setEditing(null);
    toast({
      text: "Cambios guardados",
      undo: () => update.mutate({ id: item.id, input: before }, { onError: fail }),
    });
    flashRow(`reto-${item.id}`);
  };

  const goDay = (day: number) => {
    const r = rowsNow.find((x) => x.published && x.day === day);
    if (!r) return;
    if (view === "Draft" || text) {
      setView("all");
      setQ("");
    }
    flashRow(`reto-${r.item.id}`);
  };
  const openNew = () => {
    setNewDay(published + 1);
    setEditing({ item: null });
  };

  /* Rows grouped in stretches of 15 (like "Mis retos" in the app) */
  const groups: { k: number; rows: Row[] }[] = [];
  for (const r of shown) {
    const k = Math.min(Math.ceil(r.day / STRETCH), STRETCHES + 1);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.rows.push(r);
    else groups.push({ k, rows: [r] });
  }

  const editingRow = editing?.item ? rowOf(editing.item.id) : null;
  const delRow = del ? rowOf(del.id) : null;
  const movingFrom = moving ? (rowOf(moving.item.id)?.day ?? 1) : 0;

  return (
    <>
      <PageHeader
        title="Retos diarios"
        sub="El reto del día de la home: uno por día durante 90 días, en el orden de esta lista."
        actions={
          <Button variant="primary" icon={<Icon.plus size={17} />} onClick={openNew} disabled={!query.data}>
            Nuevo reto
          </Button>
        }
      />

      {query.data && (missing > 0 || extra > 0) && (
        <div className="mb-5 flex items-start gap-3 rounded-[16px] bg-bad-bg px-4 py-3.5 text-bad">
          <Icon.alert size={20} className="mt-0.5 shrink-0" />
          <p className="text-[14px] leading-[1.5] font-medium">
            {missing > 0 ? (
              <>
                <b className="font-bold">{missing === 1 ? "Falta 1 reto." : `Faltan ${missing} retos.`}</b>{" "}
                {`${cap(daysText(published + 1, PATH_DAYS))} no ${missing === 1 ? "tiene" : "tienen"} reto en la app. Publicá un borrador o creá uno nuevo.`}
              </>
            ) : (
              <>
                <b className="font-bold">{`Hay ${published} retos publicados y el camino dura ${PATH_DAYS} días.`}</b>{" "}
                {extra === 1 ? "El último no se ve en la app." : `Los últimos ${extra} no se ven en la app.`} Pasalos a
                borrador o borralos.
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          tone="lime"
          figure="circles"
          icon={<Icon.flame size={15} />}
          label="Días con reto"
          value={query.data ? `${Math.min(published, PATH_DAYS)}/${PATH_DAYS}` : "—"}
          note={missing ? (missing === 1 ? "Falta 1 reto" : `Faltan ${missing} retos`) : "El camino está completo"}
        />
        <StatTile
          tone="violet"
          figure="halves"
          icon={<Icon.users size={15} />}
          label="En el camino hoy"
          value={query.data ? n(onPath) : "—"}
          note="personas con un reto asignado hoy"
        />
        <StatTile
          tone="lilac"
          figure="quarters"
          icon={<Icon.link size={15} />}
          label="Fuera de la app"
          value={query.data ? n(external) : "—"}
          note="retos publicados que se hacen afuera"
        />
        <StatTile
          tone="sand"
          figure="rings"
          icon={<Icon.pencil size={15} />}
          label="Borradores"
          value={query.data ? n(drafts) : "—"}
          note="no se ven ni ocupan un día"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[auto_minmax(0,1fr)]">
        <Panel
          title="Los 90 días"
          info="Cada cuadro es un día del camino, pintado según cuántas personas están hoy en ese día. Tocá un día para ir a su reto."
          actions={
            <span className="hidden sm:block">
              <RampLegend from="Menos" to="Más personas hoy" />
            </span>
          }
        >
          <div className="space-y-1.5">
            {Array.from({ length: STRETCHES }, (_, b) => (
              <div key={b} className="flex items-center gap-2">
                <span className="hidden w-[54px] shrink-0 text-right text-[11.5px] font-bold text-ink-60 tnum sm:block">{`${b * STRETCH + 1}–${(b + 1) * STRETCH}`}</span>
                <div className="grid min-w-0 flex-1 grid-cols-[repeat(15,minmax(0,1fr))] gap-1 sm:flex-none sm:grid-cols-[repeat(15,30px)]">
                  {Array.from({ length: STRETCH }, (_, k) => {
                    const day = b * STRETCH + k + 1;
                    const r = rowsNow.find((x) => x.published && x.day === day);
                    const today = r?.item.activeUsersToday ?? 0;
                    const lvl = !r
                      ? 0
                      : today === 0
                        ? 0
                        : Math.max(1, Math.round((today / maxToday) * (RAMP.length - 1)));
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => goDay(day)}
                        disabled={!r}
                        title={
                          r
                            ? `Día ${day} · “${r.item.title}” · ${plural(today, "persona", "personas")} hoy`
                            : `Día ${day}: sin reto`
                        }
                        aria-label={r ? `Día ${day}: ${r.item.title}` : `Día ${day}: sin reto`}
                        className={cx(
                          "flex aspect-square items-center justify-center rounded-[6px] text-[9px] font-bold tnum transition-transform duration-150 hover:scale-110 sm:rounded-[8px] sm:text-[11px]",
                          !r
                            ? "border-[1.5px] border-dashed border-bad/50 text-bad"
                            : lvl >= 4
                              ? "text-white"
                              : "text-ink-70",
                        )}
                        style={r ? { background: RAMP[lvl] } : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <span
                  className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-peach-20 text-[10px] font-black text-[#A8461C] tnum"
                  aria-label={`Hito del día ${(b + 1) * STRETCH}`}
                >
                  {(b + 1) * STRETCH}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cómo funciona" tone="lilac">
          <ul className="space-y-3">
            {[
              {
                icon: <Icon.flame size={16} />,
                text: (
                  <>
                    <b className="font-bold">El día de cada reto es su lugar en la lista.</b> El primero publicado es el
                    día 1, el segundo el día 2, y así hasta el 90.
                  </>
                ),
              },
              {
                icon: <Icon.grip size={16} />,
                text: (
                  <>
                    <b className="font-bold">Para cambiar el orden, arrastrá ⠿</b> (o usá ⋯ → “Mover a otro día…”). Los
                    demás se corren solos y nunca quedan huecos.
                  </>
                ),
              },
              {
                icon: <Icon.pencil size={16} />,
                text: (
                  <>
                    <b className="font-bold">Los borradores no se ven en la app ni ocupan un día.</b> Al publicarlos,
                    toman el día de su lugar.
                  </>
                ),
              },
              {
                icon: <Icon.alert size={16} />,
                text: (
                  <>
                    <b className="font-bold">Un reto que alguien ya tiene asignado no se puede borrar.</b> Pasalo a
                    borrador. Todo queda en el Historial.
                  </>
                ),
              },
            ].map((x, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-[1.45] font-medium text-[#2E2B8F]">
                <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px] bg-white/70 text-purple">
                  {x.icon}
                </span>
                <span>{x.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-8">
        <ContentToolbar
          q={q}
          onQ={setQ}
          view={view}
          onView={setView}
          label="Buscar retos"
          placeholder="Buscar por título o consigna"
          right={
            canReorder ? (
              <>
                <Icon.grip size={15} className="text-ink-40" />
                Arrastrá para cambiar el orden
              </>
            ) : (
              "Para cambiar el orden, mostrá todos y borrá la búsqueda."
            )
          }
        />
      </div>

      {query.isPending ? (
        <ListSkeleton rows={8} />
      ) : query.isError ? (
        <ListError error={query.error} onRetry={() => query.refetch()} />
      ) : shown.length ? (
        <div ref={listRef}>
          <Panel pad={false}>
            {groups.map((g) => (
              <section key={g.k} aria-label={stretchLabel(g.k)}>
                <div className="flex items-center gap-2 border-b border-bo-line bg-bo-soft px-4 py-2 first:rounded-t-[20px] sm:px-5">
                  <span className={cx("text-[12px] font-bold", g.k > STRETCHES ? "text-bad" : "text-ink-60")}>
                    {stretchLabel(g.k)}
                  </span>
                  {g.k <= STRETCHES ? (
                    <span className="rounded-full bg-peach-20 px-1.5 py-px text-[10.5px] font-black text-[#A8461C] tnum">{`hito ${g.k * STRETCH}`}</span>
                  ) : (
                    <Info text="El camino dura 90 días: estos retos están publicados pero nadie los ve. Pasalos a borrador, borralos o movelos más arriba." />
                  )}
                </div>
                <ul className="divide-y divide-bo-line">
                  {g.rows.map((r) => (
                    <RetoRow
                      key={r.item.id}
                      r={r}
                      dragging={dnd.drag?.id === r.item.id}
                      canReorder={canReorder}
                      onHandleDown={(e) => dnd.startDrag(e, r.index, r.item.id)}
                      onHandleKey={(e) => dnd.keyMove(e, r.index, r.item.id)}
                      onEdit={() => setEditing({ item: r.item })}
                      menu={[
                        {
                          label: "Editar",
                          icon: <Icon.pencil size={17} />,
                          onClick: () => setEditing({ item: r.item }),
                        },
                        ...(r.published
                          ? [
                              {
                                label: "Mover a otro día…",
                                icon: <Icon.move size={17} />,
                                onClick: () => setMoving({ item: r.item, day: r.day }),
                              },
                            ]
                          : []),
                        {
                          label: "Subir",
                          icon: <Icon.up size={17} />,
                          onClick: () => moveBy(r.index, r.index - 1),
                          disabled: !canReorder || r.index === 0,
                        },
                        {
                          label: "Bajar",
                          icon: <Icon.down size={17} />,
                          onClick: () => moveBy(r.index, r.index + 1),
                          disabled: !canReorder || r.index === list.length - 1,
                        },
                        { label: "Duplicar", icon: <Icon.copyPlus size={17} />, onClick: () => duplicate(r.item) },
                        {
                          label: r.published ? "Pasar a borrador" : "Publicar",
                          icon: r.published ? <Icon.eyeOff size={17} /> : <Icon.eye size={17} />,
                          onClick: () => setStatus(r.item, r.published ? "Draft" : "Published"),
                        },
                        {
                          label: "Borrar",
                          icon: <Icon.trash size={17} />,
                          danger: true,
                          onClick: () => setDel(r.item),
                        },
                      ]}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </Panel>
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={<Icon.flame size={22} />}
            title={
              text
                ? "Nada coincide con la búsqueda"
                : view === "Draft"
                  ? "No hay borradores"
                  : "No hay retos en este idioma"
            }
            text={text ? "Probá con otra palabra." : undefined}
            action={
              !text && (
                <Button variant="primary" icon={<Icon.plus size={16} />} onClick={openNew}>
                  Nuevo reto
                </Button>
              )
            }
          />
        </Panel>
      )}

      {editing && (
        <ChallengeEditor
          key={editing.item?.id ?? "nuevo"}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSave={(input) => onSave(input, editing.item)}
          onDelete={editing.item ? () => setDel(editing.item) : undefined}
          previewDay={editing.item ? editingRow?.day : newDay}
          sub={
            editing.item
              ? editingRow?.published
                ? `Es el reto del día ${editingRow.day}.`
                : `Borrador: si lo publicás, queda en el día ${editingRow?.day ?? published + 1}.`
              : "Se crea como borrador salvo que lo publiques: no se ve ni ocupa un día hasta entonces."
          }
          extraTop={
            !editing.item && (
              <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_#EAE7E0]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink-70">En qué día va</p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.45] font-medium text-ink-60">
                      {newDay > published
                        ? newDay > PATH_DAYS
                          ? `Al final. El camino dura ${PATH_DAYS} días: en el día ${newDay} no se vería.`
                          : `Al final de la lista: el día ${newDay}.`
                        : `El día ${newDay}: al publicarlo, ${daysText(newDay, published)} se corren un día para atrás.`}
                    </p>
                  </div>
                  <Stepper
                    label="Día"
                    value={newDay}
                    onChange={setNewDay}
                    min={1}
                    max={published + 1}
                    className="w-[136px]"
                  />
                </div>
              </div>
            )
          }
        />
      )}

      <ConfirmDialog
        open={!!del}
        title={del ? (delRow?.published ? `¿Borrar el reto del día ${delRow.day}?` : "¿Borrar este borrador?") : ""}
        text={
          del
            ? delRow?.published
              ? delRow.day < published
                ? `Deja de verse en la app. Los que siguen se corren un día: ${daysText(delRow.day + 1, published)} pasan a ser ${daysText(delRow.day, published - 1)}. Podés deshacerlo desde el aviso.`
                : "Deja de verse en la app. Podés deshacerlo desde el aviso."
              : "No se ve en la app, así que no cambia ningún día. Podés deshacerlo desde el aviso."
            : undefined
        }
        confirm="Borrar"
        loading={remove.isPending}
        onClose={() => setDel(null)}
        onConfirm={() => del && onDelete(del)}
      >
        {del && (
          <p className="rounded-[12px] bg-bo-soft px-3.5 py-2.5 text-[13.5px] font-bold text-ink shadow-[inset_0_0_0_1px_#EFEDE7]">
            {del.title}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!inUse}
        tone="primary"
        title="No se puede borrar"
        text={
          inUse?.status === "Published"
            ? "Hay personas que ya tienen este reto asignado. Podés pasarlo a borrador: deja de verse en la app y los días siguientes se corren uno."
            : "Hay personas que ya tienen este reto asignado, así que tiene que quedar guardado. Como es un borrador, no se ve en la app."
        }
        confirm={inUse?.status === "Published" ? "Pasar a borrador" : "Entendido"}
        onClose={() => setInUse(null)}
        onConfirm={() => {
          if (inUse?.status === "Published") {
            setStatus(inUse, "Draft");
            setEditing(null);
          }
          setInUse(null);
        }}
      />

      <ConfirmDialog
        open={!!moving}
        tone="primary"
        title="Mover a otro día"
        text={moving ? `“${moving.item.title}” hoy es el día ${movingFrom}.` : undefined}
        confirm="Mover"
        disabled={!moving || moving.day === movingFrom}
        onClose={() => setMoving(null)}
        onConfirm={() => {
          if (!moving) return;
          reorder(moving.item, placeAt(list, moving.item.id, moving.day));
          setMoving(null);
          flashRow(`reto-${moving.item.id}`);
        }}
      >
        {moving && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-bo-soft p-3.5 shadow-[inset_0_0_0_1px_#EFEDE7]">
            <p className="min-w-0 flex-1 text-[13px] leading-[1.45] font-medium text-ink-70">
              {moving.day === movingFrom
                ? "Elegí el día al que lo querés llevar."
                : moving.day < movingFrom
                  ? `Va a ser el día ${moving.day}. Los retos ${daysText(moving.day, movingFrom - 1)} se corren un día para adelante.`
                  : `Va a ser el día ${moving.day}. Los retos ${daysText(movingFrom + 1, moving.day)} se corren un día para atrás.`}
            </p>
            <Stepper
              label="Día"
              value={moving.day}
              onChange={(day) => setMoving({ ...moving, day })}
              min={1}
              max={published}
              className="w-[136px]"
            />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}

function RetoRow({
  r,
  dragging,
  canReorder,
  onHandleDown,
  onHandleKey,
  onEdit,
  menu,
}: {
  r: Row;
  dragging: boolean;
  canReorder: boolean;
  onHandleDown: (e: PointerEvent) => void;
  onHandleKey: (e: KeyboardEvent) => void;
  onEdit: () => void;
  menu: MenuItem[];
}) {
  const { item, day, published } = r;
  const late = published && day > PATH_DAYS;
  const inputs = item.inputDefinitions?.length ?? 0;
  return (
    <li
      id={`reto-${item.id}`}
      data-index={r.index}
      className={cx(
        "relative flex items-center gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-4",
        dragging && "z-[1] rounded-[14px] bg-white shadow-[0_0_0_2px_#5E5BE2,0_14px_34px_rgba(36,35,35,0.18)]",
      )}
    >
      {canReorder && (
        <button
          type="button"
          data-handle={item.id}
          aria-label={`Cambiar el orden de “${short(item.title)}”${published ? ` (día ${day})` : ""}: arrastrá, o usá las flechas arriba y abajo`}
          onPointerDown={onHandleDown}
          onKeyDown={onHandleKey}
          className={cx(
            "flex h-[36px] w-[24px] shrink-0 touch-none items-center justify-center rounded-[8px] text-ink-40 hover:bg-ink/[0.05] hover:text-ink-70",
            dragging ? "cursor-grabbing text-purple" : "cursor-grab",
          )}
        >
          <Icon.grip size={18} />
        </button>
      )}
      <span
        className={cx(
          "flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[13px]",
          !published
            ? "border-[1.5px] border-dashed border-[#D6D2C9] text-ink-60"
            : late
              ? "bg-bad-bg text-bad"
              : dragging
                ? "bg-purple text-white"
                : "bg-purple-10 text-purple",
        )}
        aria-label={published ? `Día ${day}` : "Borrador, sin día"}
      >
        <span className="text-[9px] leading-none font-bold tracking-[0.06em] uppercase opacity-80">Día</span>
        <span className="mt-0.5 text-[17px] leading-none font-black tnum">{published ? day : "—"}</span>
      </span>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="truncate text-[14.5px] leading-[1.3] font-bold text-ink hover:text-purple">
            {item.title}
          </span>
          {!published && <Badge size="sm">Borrador</Badge>}
          {item.type === "External" && (
            <Badge size="sm" tone="info">
              Fuera de la app
            </Badge>
          )}
          {late && (
            <Badge size="sm" tone="bad">
              No se ve
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] font-medium text-ink-60">
          {!published ? `Si lo publicás, queda en el día ${day} · ` : ""}
          {item.type === "InApp" ? `${plural(inputs, "renglón", "renglones")} · ` : ""}
          {item.action}
        </span>
      </button>
      {published && !late && (
        <span
          className="hidden w-[96px] shrink-0 text-right text-[12px] font-bold text-ink md:block"
          title="Personas cuyo día del camino hoy es este"
        >
          {`${n(item.activeUsersToday)} hoy`}
        </span>
      )}
      <span className="hidden sm:block">
        <Button size="sm" icon={<Icon.pencil size={15} />} onClick={onEdit}>
          Editar
        </Button>
      </span>
      <Menu label={`Acciones de “${short(item.title)}”`} items={menu} />
    </li>
  );
}

/* ═══════════════ Editor ═══════════════ */

type ChallengeDraft = {
  title: string;
  action: string;
  type: ChallengeType;
  inputs: { key?: string; label: string }[];
  status: ContentStatus;
};

function validate(d: ChallengeDraft): Record<string, string | null> {
  return {
    title: !d.title.trim() ? "Ponele un título." : d.title.length > 200 ? "Máximo 200 caracteres." : null,
    action: !d.action.trim()
      ? "Escribí la consigna: qué tiene que hacer la persona."
      : d.action.length > 1000
        ? "Máximo 1.000 caracteres."
        : null,
    inputs:
      d.type !== "InApp"
        ? null
        : !d.inputs.length
          ? "Tiene que tener al menos un renglón para responder."
          : d.inputs.length > 5
            ? "Máximo 5 renglones."
            : d.inputs.some((f) => !f.label.trim())
              ? "Hay renglones vacíos: escribí su texto de ayuda o borralos."
              : null,
  };
}

function ChallengeEditor({
  item,
  onClose,
  onSave,
  onDelete,
  previewDay,
  sub,
  extraTop,
}: {
  item: Challenge | null;
  onClose: () => void;
  onSave: (input: ChallengeInput) => Promise<void>;
  onDelete?: () => void;
  previewDay?: number;
  sub: string;
  extraTop?: ReactNode;
}) {
  const toast = useToast();
  const [d, setDraft] = useState<ChallengeDraft>(() =>
    item
      ? {
          title: item.title,
          action: item.action,
          type: item.type,
          inputs: (item.inputDefinitions ?? []).map((x) => ({ ...x })),
          status: item.status,
        }
      : { title: "", action: "", type: "InApp", inputs: [{ label: "" }], status: "Draft" },
  );
  const [initial] = useState(() => JSON.stringify(d));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = validate(d);
  const hasErr = Object.values(errors).some(Boolean);
  const err = (k: string) => (tried ? (errors[k] ?? null) : null);
  const set = (p: Partial<ChallengeDraft>) => setDraft((x) => ({ ...x, ...p }));
  const dirty = JSON.stringify(d) !== initial;

  const setInput = (i: number, label: string) =>
    set({ inputs: d.inputs.map((f, k) => (k === i ? { ...f, label } : f)) });
  const moveInput = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.inputs.length) return;
    set({ inputs: moveIndex(d.inputs, i, j) });
  };

  const submit = () => {
    setTried(true);
    if (hasErr || saving) return;
    setSaving(true);
    onSave({
      title: d.title.trim(),
      action: d.action.trim(),
      type: d.type,
      status: d.status,
      inputDefinitions:
        d.type === "InApp"
          ? d.inputs.map((f) => ({ ...(f.key ? { key: f.key } : {}), label: f.label.trim() }))
          : undefined,
    })
      .catch((e) => toast({ text: describeError(e), tone: "bad" }))
      .finally(() => setSaving(false));
  };

  return (
    <EditorDrawer
      title={item ? "Editar reto" : "Nuevo reto"}
      sub={sub}
      dirty={dirty}
      isNew={!item}
      saving={saving}
      showErrors={tried && hasErr}
      onSubmit={submit}
      onClose={onClose}
      onDelete={onDelete}
      preview={
        <ChallengePreview
          title={d.title}
          action={d.action}
          type={d.type}
          labels={d.inputs.map((f) => f.label)}
          day={previewDay}
        />
      }
    >
      {extraTop}
      <Field
        label="Título"
        value={d.title}
        onChange={(e) => set({ title: e.target.value })}
        error={err("title")}
        counter={{ n: d.title.length, max: 200 }}
        placeholder="Ej.: Lo que me llevo"
      />
      <TextArea
        label="Consigna"
        rows={4}
        value={d.action}
        onChange={(e) => set({ action: e.target.value })}
        error={err("action")}
        counter={{ n: d.action.length, max: 1000 }}
        placeholder="Qué tiene que hacer la persona y para qué le sirve, en dos o tres oraciones."
      />
      <div>
        <p className="mb-1.5 text-[13px] font-bold text-ink-70">Dónde se hace</p>
        <Segmented<ChallengeType>
          label="Dónde se hace"
          value={d.type}
          onChange={(type) => set({ type, inputs: type === "InApp" && !d.inputs.length ? [{ label: "" }] : d.inputs })}
          options={[
            { id: "InApp", label: "En la app (escribe)" },
            { id: "External", label: "Fuera de la app" },
          ]}
        />
      </div>
      {d.type === "InApp" && (
        <div>
          <p className="text-[13px] font-bold text-ink-70">Renglones para responder</p>
          <p className="mt-0.5 mb-2 text-[12.5px] leading-[1.45] font-medium text-ink-60">
            Cada renglón es un espacio para escribir; el texto es la ayuda en gris (en la app: “Un aprendizaje que me
            dejó...”). De 1 a 5.
          </p>
          <ol className="space-y-2">
            {d.inputs.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-purple text-[12px] font-bold text-white tnum">
                  {i + 1}
                </span>
                <Field
                  label={`Texto de ayuda del renglón ${i + 1}`}
                  hideLabel
                  value={f.label}
                  onChange={(e) => setInput(i, e.target.value)}
                  placeholder="Ej.: Algo que descubrí de mí..."
                  className="min-w-0 flex-1"
                />
                <IconButton label={`Subir renglón ${i + 1}`} onClick={() => moveInput(i, -1)} disabled={i === 0}>
                  <Icon.up size={16} />
                </IconButton>
                <IconButton
                  label={`Bajar renglón ${i + 1}`}
                  onClick={() => moveInput(i, 1)}
                  disabled={i === d.inputs.length - 1}
                >
                  <Icon.down size={16} />
                </IconButton>
                <IconButton
                  label={`Quitar renglón ${i + 1}`}
                  tone="danger"
                  disabled={d.inputs.length <= 1}
                  onClick={() => set({ inputs: d.inputs.filter((_, k) => k !== i) })}
                >
                  <Icon.x size={16} />
                </IconButton>
              </li>
            ))}
          </ol>
          {d.inputs.length < 5 && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              icon={<Icon.plus size={15} />}
              onClick={() => set({ inputs: [...d.inputs, { label: "" }] })}
            >
              Sumar renglón
            </Button>
          )}
          <FieldError text={err("inputs")} />
        </div>
      )}
      <StatusToggle
        status={d.status}
        onChange={(status) => set({ status })}
        hint={
          d.status === "Published"
            ? "Se ve en la app el día que le toca."
            : "Borrador: no se ve en la app y no ocupa ningún día."
        }
      />
    </EditorDrawer>
  );
}
