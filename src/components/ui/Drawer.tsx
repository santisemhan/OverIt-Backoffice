"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { trapFocus, useEscape } from "@/lib/a11y";
import { IconButton } from "./Button";
import { Icon } from "./icons";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/* ═══════════════ Panel lateral (editar contenido, ver un reporte en el celular) ═══════════════ */

export function Drawer({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const reduce = useReducedMotion();
  useEscape(open, onClose);
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);
  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement;
      const id = requestAnimationFrame(() =>
        (
          panel.current?.querySelector<HTMLElement>(
            "[data-drawer-body] input, [data-drawer-body] textarea, [data-autofocus]",
          ) ?? panel.current?.querySelector<HTMLElement>("button")
        )?.focus({ preventScroll: true }),
      );
      document.documentElement.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(id);
        document.documentElement.style.overflow = "";
        (returnTo.current as HTMLElement | null)?.focus?.({ preventScroll: true });
      };
    }
  }, [open]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-transparent"
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
        >
          <motion.div
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            onKeyDown={(e) => trapFocus(e, panel.current)}
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-bo-bg shadow-[-12px_0_40px_rgba(0,0,0,0.12)]"
            style={{ maxWidth: width }}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%", transition: { duration: 0.22, ease: EASE_OUT } }}
            transition={{ duration: 0.38, ease: EASE_DRAWER }}
          >
            <header className="flex items-start gap-3 border-b border-bo-line bg-white px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] leading-[1.2] font-black tracking-[-0.02em] text-ink">{title}</h2>
                {sub && <p className="mt-0.5 text-[13px] font-medium text-ink-60">{sub}</p>}
              </div>
              <IconButton label="Cerrar" onClick={onClose}>
                <Icon.x size={18} />
              </IconButton>
            </header>
            <div data-drawer-body className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {children}
            </div>
            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-bo-line bg-white px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ═══════════════ Hoja desde abajo (celular): filtros y opciones ═══════════════ */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true }),
    );
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = "";
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] bg-transparent" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-ink/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            onKeyDown={(e) => trapFocus(e, panel.current)}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[26px] bg-bo-bg shadow-[0_-12px_40px_rgba(0,0,0,0.14)]"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%", transition: { duration: 0.22, ease: EASE_OUT } }}
            transition={{ duration: 0.4, ease: EASE_DRAWER }}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 90 || info.velocity.y > 500) && onClose()}
          >
            <div className="flex shrink-0 cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing">
              <span className="h-[5px] w-[40px] rounded-full bg-ink/15" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-5 pb-2">
              <h2 className="text-[19px] font-black tracking-[-0.02em] text-ink">{title}</h2>
              <IconButton label="Cerrar" onClick={onClose}>
                <Icon.x size={18} />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-bo-line bg-white px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
