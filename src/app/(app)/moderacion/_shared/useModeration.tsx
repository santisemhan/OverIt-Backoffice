"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { describeError } from "@/lib/api";
import { useModerate, useRenameUser } from "@/lib/moderacion/mutations";
import type { ModerationKind } from "@/lib/moderacion/types";

/*
 * Moderation actions shared by Comunidad and Reportes: remove (asks first, optional reason), restore and "No
 * infringe" (immediate, with a toast), and changing someone's visible name. Remove and restore can be undone from
 * the toast (they are each other's inverse); "No infringe" cannot (the server has no "reopen").
 * Render `dialogs` once in the page.
 */

export interface ModTarget {
  kind: ModerationKind;
  id: string;
}

export interface RenameTarget {
  id: string;
  name: string | null;
}

const NAME_MAX = 50;
const REASON_MAX = 500;
const noun = (k: ModerationKind) => (k === "posts" ? "Publicación" : "Comentario");

export function useModeration() {
  const toast = useToast();
  const moderate = useModerate();
  const rename = useRenameUser();
  const [ask, setAsk] = useState<ModTarget | null>(null);
  const [reason, setReason] = useState("");
  const [renaming, setRenaming] = useState<RenameTarget | null>(null);
  const [name, setName] = useState("");

  const fail = (e: unknown) => toast({ text: describeError(e), tone: "bad" });

  const run = (t: ModTarget, action: "remove" | "restore", reasonText?: string, undoable = true) =>
    moderate.mutateAsync({ ...t, action, reason: reasonText }).then(() => {
      const female = t.kind === "posts";
      const done = action === "remove" ? (female ? "eliminada" : "eliminado") : female ? "restaurada" : "restaurado";
      toast({
        text: `${noun(t.kind)} ${done}`,
        tone: "ok",
        undo: undoable
          ? () => run(t, action === "remove" ? "restore" : "remove", undefined, false).catch(fail)
          : undefined,
      });
    });

  const askRemove = (t: ModTarget) => {
    setReason("");
    setAsk(t);
  };
  const restore = (t: ModTarget) => run(t, "restore").catch(fail);
  const dismiss = (t: ModTarget) =>
    moderate
      .mutateAsync({ ...t, action: "dismiss" })
      .then(() => toast({ text: "Marcado como “No infringe”. Sus reportes quedaron resueltos.", tone: "ok" }))
      .catch(fail);

  const openRename = (u: RenameTarget) => {
    setName(u.name ?? "");
    setRenaming(u);
  };
  const trimmed = name.trim();
  const nameErr = !trimmed ? "Escribí un nombre." : trimmed.length > NAME_MAX ? `Hasta ${NAME_MAX} letras.` : null;
  const same = !!renaming && trimmed === (renaming.name ?? "");

  const doRename = () => {
    if (!renaming || nameErr || same) return;
    const prev = renaming.name;
    const id = renaming.id;
    rename
      .mutateAsync({ id, name: trimmed })
      .then(() => {
        setRenaming(null);
        toast({
          text: "Nombre cambiado",
          tone: "ok",
          undo: prev
            ? () =>
                rename
                  .mutateAsync({ id, name: prev })
                  .then(() => toast({ text: "Volvió el nombre anterior", tone: "ok" }))
                  .catch(fail)
            : undefined,
        });
      })
      .catch(fail);
  };

  const dialogs = (
    <>
      <ConfirmDialog
        open={!!ask}
        title={ask?.kind === "comments" ? "¿Eliminar este comentario?" : "¿Eliminar esta publicación?"}
        text="Desaparece de la comunidad para todos y sus reportes quedan resueltos. Podés restaurarla después."
        confirm="Eliminar"
        loading={moderate.isPending}
        disabled={reason.length > REASON_MAX}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          const t = ask;
          run(t, "remove", reason)
            .then(() => setAsk(null))
            .catch(fail);
        }}
      >
        <TextArea
          label="Motivo (opcional)"
          hint="Queda en el Historial. La persona no lo ve."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          counter={{ n: reason.length, max: REASON_MAX }}
          error={reason.length > REASON_MAX ? `Hasta ${REASON_MAX} caracteres.` : null}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={!!renaming}
        title="Cambiar nombre visible"
        text="Cambia cómo se ve esta persona en la comunidad y en la app. Su cuenta no cambia."
        confirm="Guardar"
        tone="primary"
        loading={rename.isPending}
        disabled={!!nameErr || same}
        onClose={() => setRenaming(null)}
        onConfirm={doRename}
      >
        <Field
          label="Nombre nuevo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX + 10}
          counter={{ n: trimmed.length, max: NAME_MAX }}
          error={name && nameErr ? nameErr : null}
          hint={same ? "Escribí un nombre distinto al actual." : "Se guarda con mayúscula inicial, como en la app."}
          autoFocus
        />
      </ConfirmDialog>
    </>
  );

  return { askRemove, restore, dismiss, openRename, dialogs, busy: moderate.isPending };
}
