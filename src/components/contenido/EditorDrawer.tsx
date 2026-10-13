"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/icons";

/*
 * Shell shared by every content editor: form on the left, live preview on the right, footer with Borrar / Cancelar /
 * Guardar. Closing with unsaved changes (Escape, backdrop, X, Cancelar or leaving the page) asks first.
 */
export function EditorDrawer({
  title,
  sub,
  dirty,
  isNew,
  saving,
  showErrors,
  onSubmit,
  onClose,
  onDelete,
  preview,
  children,
}: {
  title: string;
  sub?: ReactNode;
  dirty: boolean;
  isNew: boolean;
  saving: boolean;
  /** Validation was attempted and failed. */
  showErrors: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onDelete?: () => void;
  preview: ReactNode;
  children: ReactNode;
}) {
  const [askClose, setAskClose] = useState(false);
  const requestClose = () => (dirty ? setAskClose(true) : onClose());

  /* Reloading or closing the tab with unsaved changes asks the browser's own question. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <>
      <Drawer
        open
        onClose={requestClose}
        width={980}
        title={title}
        sub={sub}
        footer={
          <>
            {onDelete && (
              <Button variant="dangerSoft" icon={<Icon.trash size={15} />} onClick={onDelete} className="mr-auto">
                Borrar
              </Button>
            )}
            {showErrors && <span className="text-[13px] font-bold text-bad">Revisá los campos marcados.</span>}
            <Button onClick={requestClose}>Cancelar</Button>
            <Button variant="primary" onClick={onSubmit} loading={saving} disabled={!isNew && !dirty}>
              {isNew ? "Crear" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          noValidate
        >
          <div className="min-w-0 space-y-4">{children}</div>
          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-[12.5px] font-bold text-ink-60">Vista previa</p>
            {preview}
          </div>
        </form>
      </Drawer>
      <ConfirmDialog
        open={askClose}
        title="¿Salir sin guardar?"
        text="Los cambios que hiciste se pierden."
        confirm="Salir sin guardar"
        onClose={() => setAskClose(false)}
        onConfirm={() => {
          setAskClose(false);
          onClose();
        }}
      />
    </>
  );
}
