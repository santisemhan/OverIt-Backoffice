"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button } from "./Button";

/*
 * Modal built on the native <dialog>: the browser traps focus, handles Escape and renders the backdrop. Clicking the
 * backdrop closes it. Content only mounts while open so forms reset between openings.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row, right-aligned on desktop and stacked on phones. */
  footer?: ReactNode;
  width?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      className={cx(
        "m-auto rounded-[20px] bg-white p-0 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.24)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] open:animate-[bo-fade_180ms_var(--ease-out)]",
        className,
      )}
    >
      {open && (
        <div className="p-6">
          <h2 className="text-[19px] leading-[1.2] font-black tracking-[-0.02em]">{title}</h2>
          {description && <div className="mt-2 text-[14px] leading-[1.5] font-medium text-ink-70">{description}</div>}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/* Confirmation for anything that deletes or changes data: Cancel + one action, Enter confirms. */
export function ConfirmDialog({
  open,
  title,
  text,
  confirm,
  tone = "danger",
  onConfirm,
  onClose,
  children,
  disabled,
  loading,
}: {
  open: boolean;
  title: string;
  text?: ReactNode;
  confirm: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={text}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && !loading) onConfirm();
        }}
      >
        {children}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={disabled}
            loading={loading}
          >
            {confirm}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
