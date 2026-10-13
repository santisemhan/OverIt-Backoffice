"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";
import { useEscape } from "@/lib/a11y";
import { Icon } from "./icons";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ═══════════════ Menú desplegable (⋮), anclado al botón, fuera de cualquier overflow ═══════════════ */

export type MenuItem = { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void; disabled?: boolean };
export function Menu({
  items,
  label = "Más acciones",
  trigger,
  triggerClassName,
  align = "end",
  header,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  /** Para un botón con otro aspecto (por ejemplo, en la columna violeta) */
  triggerClassName?: string;
  /** "start": el menú se abre hacia la derecha del botón (para los botones pegados al borde izquierdo) */
  align?: "start" | "end";
  /** Algo arriba de las opciones (por ejemplo, quién tiene la sesión abierta) */
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const close = useCallback(() => setOpen(false), []);
  /* Escape cierra el menú y devuelve el foco al botón ⋮ */
  useEscape(open, () => {
    setOpen(false);
    btn.current?.focus();
  });
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = items.length * 42 + 12 + (header ? 62 : 0);
    const up = r.bottom + h + 8 > window.innerHeight && r.top > h;
    setPos({
      top: up ? (align === "start" ? r.bottom - h : r.top - h - 6) : align === "start" ? r.top : r.bottom + 6,
      left: Math.max(8, Math.min(window.innerWidth - 228, align === "start" ? r.right + 8 : r.right - 220)),
      up,
    });
  }, [open, items.length, align, header]);
  useEffect(() => {
    if (!open) return;
    const on = (e: Event) => {
      if (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", on);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);
  useEffect(() => {
    if (open) requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus());
  }, [open]);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={
          triggerClassName
            ? cx("flex press items-center justify-center", triggerClassName)
            : cx(
                "flex h-[34px] min-w-[34px] press items-center justify-center rounded-[10px] text-ink-60 hover:bg-ink/[0.06] hover:text-ink",
                open && "bg-ink/[0.06] text-ink",
              )
        }
      >
        {trigger ?? <Icon.more size={20} />}
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menu}
                role="menu"
                className="fixed z-[90] w-[220px] rounded-[14px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(36,35,35,0.06),0_14px_36px_rgba(36,35,35,0.16)]"
                style={{
                  top: pos.top,
                  left: pos.left,
                  transformOrigin:
                    align === "start" ? (pos.up ? "0% 100%" : "0% 0%") : pos.up ? "100% 100%" : "100% 0%",
                }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
                onKeyDown={(e) => {
                  const list = [...(menu.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
                  const i = list.indexOf(document.activeElement as HTMLElement);
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    list[(i + 1) % list.length]?.focus();
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    list[(i - 1 + list.length) % list.length]?.focus();
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    setOpen(false);
                    btn.current?.focus();
                  }
                }}
              >
                {header && <div className="mb-1 border-b border-bo-line px-2.5 pt-1.5 pb-2.5">{header}</div>}
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={() => {
                      setOpen(false);
                      it.onClick();
                    }}
                    className={cx(
                      "flex h-[40px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[14px] font-bold disabled:opacity-40",
                      it.danger
                        ? "text-bad hover:bg-bad-bg focus-visible:bg-bad-bg"
                        : "text-ink hover:bg-ink/[0.05] focus-visible:bg-ink/[0.05]",
                    )}
                  >
                    <span className={it.danger ? "text-bad" : "text-ink-60"}>{it.icon}</span>
                    {it.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
