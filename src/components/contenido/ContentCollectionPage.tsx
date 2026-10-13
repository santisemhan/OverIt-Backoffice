"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { Menu } from "@/components/ui/Menu";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ago } from "@/lib/format";
import {
  toInput,
  useCreateContent,
  useDeleteContent,
  useReorderContent,
  useUpdateContent,
} from "@/lib/contenido/mutations";
import { useContentList } from "@/lib/contenido/queries";
import type { ContentInputMap, ContentItemMap, ContentStatus } from "@/lib/contenido/types";
import type { Collection, CollectionKind } from "./collections";
import { EditorDrawer } from "./EditorDrawer";
import { useContentLanguage } from "./language";
import { ContentToolbar, ListError, ListSkeleton, short, StatusToggle, type StatusView } from "./shared";
import { flashRow, moveIndex, useDragReorder } from "./useDragReorder";

/*
 * List + editor for a content collection (Respiraciones, Artículos & Tips, Frases, Datos científicos): search, status
 * and language filters, reorder (drag ⠿, ↑ ↓ on it, or Subir/Bajar), publish/draft, delete with confirmation and
 * "Deshacer" on every change.
 */
export function ContentCollectionPage<K extends CollectionKind, D extends { status: ContentStatus }>({
  config,
}: {
  config: Collection<K, D>;
}) {
  const { kind } = config;
  type Item = ContentItemMap[K];
  const [lang] = useContentLanguage();
  const query = useContentList(kind, lang);
  const list = (query.data ?? []) as Item[];
  const toast = useToast();
  const create = useCreateContent(kind);
  const update = useUpdateContent(kind);
  const remove = useDeleteContent(kind);
  const reorderM = useReorderContent(kind);
  const [q, setQ] = useState("");
  const [view, setView] = useState<StatusView>("all");
  const [editing, setEditing] = useState<{ item: Item | null } | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [now] = useState(() => Date.now());

  const text = q.trim().toLowerCase();
  const canReorder = !text && view === "all";
  const rowId = (id: string) => `${kind}-${id}`;
  const fail = (e: unknown) => toast({ text: describeError(e), tone: "bad" });

  const putOrder = (ids: string[], undoIds?: string[]) =>
    reorderM.mutate(
      { language: lang, ids },
      {
        onSuccess: () =>
          toast({
            text: "Orden guardado",
            undo: undoIds ? () => reorderM.mutate({ language: lang, ids: undoIds }, { onError: fail }) : undefined,
          }),
        onError: fail,
      },
    );
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const ids = list.map((x) => x.id);
    putOrder(moveIndex(ids, from, to), ids);
  };
  const dnd = useDragReorder({ count: list.length, enabled: canReorder, listRef, onMove: move });
  const ordered = dnd.preview(list);
  const shown = ordered
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        (view === "all" || item.status === view) && (!text || config.search(item).toLowerCase().includes(text)),
    );

  const putItem = (id: string, input: ContentInputMap[K]) => update.mutateAsync({ id, input });

  const toggleStatus = (item: Item) => {
    const before = toInput(kind, item);
    const status: ContentStatus = item.status === "Published" ? "Draft" : "Published";
    putItem(item.id, { ...before, status }).then(
      () =>
        toast({
          text: status === "Published" ? "Publicado: ya se ve en la app" : "Pasó a borrador: no se ve en la app",
          undo: () => putItem(item.id, before).catch(fail),
        }),
      fail,
    );
  };

  const onDelete = (item: Item) => {
    const index = list.findIndex((x) => x.id === item.id);
    const before = toInput(kind, item);
    remove.mutate(item.id, {
      onSuccess: () => {
        setDel(null);
        setEditing(null);
        toast({
          text: "Borrado",
          undo: () => create.mutate({ ...before, language: item.language, position: index }, { onError: fail }),
        });
      },
      onError: fail,
    });
  };

  const onSave = async (input: ContentInputMap[K], item: Item | null) => {
    if (!item) {
      const { id } = await create.mutateAsync({ ...input, language: lang });
      setEditing(null);
      toast({ text: "Creado", undo: () => remove.mutate(id, { onError: fail }) });
      flashRow(rowId(id));
      return;
    }
    const before = toInput(kind, item);
    await putItem(item.id, input);
    setEditing(null);
    toast({ text: "Cambios guardados", undo: () => putItem(item.id, before).catch(fail) });
    flashRow(rowId(item.id));
  };

  return (
    <>
      <PageHeader
        title={config.label}
        sub={config.sub}
        actions={
          <Button variant="primary" icon={<Icon.plus size={17} />} onClick={() => setEditing({ item: null })}>
            {config.nuevo}
          </Button>
        }
      />
      <ContentToolbar
        q={q}
        onQ={setQ}
        view={view}
        onView={setView}
        label={`Buscar en ${config.label}`}
        right={
          query.data &&
          (canReorder ? (
            <>
              <Icon.grip size={15} className="text-ink-40" />
              {`${config.count(list.length)} · arrastrá para cambiar el orden`}
            </>
          ) : (
            config.count(list.length)
          ))
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ListError error={query.error} onRetry={() => query.refetch()} />
      ) : shown.length ? (
        <Panel pad={false}>
          <ul ref={listRef} className="divide-y divide-bo-line">
            {shown.map(({ item, index }) => {
              const title = config.title(item);
              const dragging = dnd.drag?.id === item.id;
              const meta = config.meta(item);
              return (
                <li
                  key={item.id}
                  id={rowId(item.id)}
                  data-index={index}
                  className={cx(
                    "relative flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5",
                    dragging &&
                      "z-[1] rounded-[14px] bg-white shadow-[0_0_0_2px_#5E5BE2,0_14px_34px_rgba(36,35,35,0.18)]",
                  )}
                >
                  {canReorder && (
                    <button
                      type="button"
                      data-handle={item.id}
                      aria-label={`Cambiar el orden de “${short(title)}”: arrastrá, o usá las flechas arriba y abajo`}
                      onPointerDown={(e) => dnd.startDrag(e, index, item.id)}
                      onKeyDown={(e) => dnd.keyMove(e, index, item.id)}
                      className={cx(
                        "flex h-[36px] w-[24px] shrink-0 touch-none items-center justify-center rounded-[8px] text-ink-40 hover:bg-ink/[0.05] hover:text-ink-70",
                        dragging ? "cursor-grabbing text-purple" : "cursor-grab",
                      )}
                    >
                      <Icon.grip size={18} />
                    </button>
                  )}
                  <config.Thumb item={item} />
                  <button type="button" onClick={() => setEditing({ item })} className="min-w-0 flex-1 text-left">
                    <span className="line-clamp-2 text-[14.5px] leading-[1.35] font-bold text-ink hover:text-purple">
                      {title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-ink-60">
                      {item.status === "Draft" ? (
                        <Badge size="sm">Borrador</Badge>
                      ) : (
                        <Badge size="sm" tone="ok">
                          Publicado
                        </Badge>
                      )}
                      {meta && <span>{meta}</span>}
                      {item.updatedAt && (
                        <span>{`· editado ${ago(Date.parse(item.updatedAt), now).toLowerCase()}`}</span>
                      )}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {canReorder && (
                      <span className="hidden lg:flex">
                        <IconButton label="Subir" onClick={() => move(index, index - 1)} disabled={index === 0}>
                          <Icon.up size={17} />
                        </IconButton>
                        <IconButton
                          label="Bajar"
                          onClick={() => move(index, index + 1)}
                          disabled={index === list.length - 1}
                        >
                          <Icon.down size={17} />
                        </IconButton>
                      </span>
                    )}
                    <span className="hidden sm:block">
                      <Button size="sm" icon={<Icon.pencil size={15} />} onClick={() => setEditing({ item })}>
                        Editar
                      </Button>
                    </span>
                    <Menu
                      label={`Acciones de “${short(title)}”`}
                      items={[
                        { label: "Editar", icon: <Icon.pencil size={17} />, onClick: () => setEditing({ item }) },
                        {
                          label: "Subir",
                          icon: <Icon.up size={17} />,
                          onClick: () => move(index, index - 1),
                          disabled: !canReorder || index === 0,
                        },
                        {
                          label: "Bajar",
                          icon: <Icon.down size={17} />,
                          onClick: () => move(index, index + 1),
                          disabled: !canReorder || index === list.length - 1,
                        },
                        {
                          label: item.status === "Published" ? "Pasar a borrador" : "Publicar",
                          icon: item.status === "Published" ? <Icon.eyeOff size={17} /> : <Icon.eye size={17} />,
                          onClick: () => toggleStatus(item),
                        },
                        { label: "Borrar", icon: <Icon.trash size={17} />, danger: true, onClick: () => setDel(item) },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={config.icon}
            title={
              text
                ? "Nada coincide con la búsqueda"
                : view === "Draft"
                  ? "No hay borradores"
                  : view === "Published"
                    ? "No hay nada publicado"
                    : `Todavía no hay ${config.label.toLowerCase()} en este idioma`
            }
            text={text ? "Probá con otra palabra." : undefined}
            action={
              !text && (
                <Button variant="primary" icon={<Icon.plus size={16} />} onClick={() => setEditing({ item: null })}>
                  {config.nuevo}
                </Button>
              )
            }
          />
        </Panel>
      )}

      {editing && (
        <CollectionEditor
          key={editing.item?.id ?? "nuevo"}
          config={config}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSave={(input) => onSave(input, editing.item)}
          onDelete={editing.item ? () => setDel(editing.item) : undefined}
        />
      )}

      <ConfirmDialog
        open={!!del}
        title={`¿Borrar ${config.this}?`}
        text="Deja de verse en la app para todos. Podés deshacerlo desde el aviso."
        confirm="Borrar"
        loading={remove.isPending}
        onClose={() => setDel(null)}
        onConfirm={() => del && onDelete(del)}
      >
        {del && (
          <p className="rounded-[12px] bg-bo-soft px-3.5 py-2.5 text-[13.5px] font-bold text-ink shadow-[inset_0_0_0_1px_#EFEDE7]">
            {short(config.title(del), 140)}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}

function CollectionEditor<K extends CollectionKind, D extends { status: ContentStatus }>({
  config,
  item,
  onClose,
  onSave,
  onDelete,
}: {
  config: Collection<K, D>;
  item: ContentItemMap[K] | null;
  onClose: () => void;
  onSave: (input: ContentInputMap[K]) => Promise<void>;
  onDelete?: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<D>(() => (item ? config.fromItem(item) : config.empty()));
  const [initial] = useState(() => JSON.stringify(draft));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = config.validate(draft);
  const hasErr = Object.values(errors).some(Boolean);
  const err = (k: string) => (tried ? (errors[k] ?? null) : null);
  const set = (p: Partial<D>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify(draft) !== initial;
  const { Form, Preview } = config;

  const submit = () => {
    setTried(true);
    if (hasErr || saving) return;
    setSaving(true);
    onSave(config.toInput(draft))
      .catch((e) => toast({ text: describeError(e), tone: "bad" }))
      .finally(() => setSaving(false));
  };

  return (
    <EditorDrawer
      title={item ? `Editar: ${short(config.title(item), 40)}` : config.nuevo}
      sub={item ? undefined : "Se crea como borrador salvo que lo publiques: no se ve en la app hasta entonces."}
      dirty={dirty}
      isNew={!item}
      saving={saving}
      showErrors={tried && hasErr}
      onSubmit={submit}
      onClose={onClose}
      onDelete={onDelete}
      preview={<Preview d={draft} />}
    >
      <Form d={draft} set={set} err={err} />
      <StatusToggle status={draft.status} onChange={(status) => set({ status } as Partial<D>)} />
    </EditorDrawer>
  );
}
