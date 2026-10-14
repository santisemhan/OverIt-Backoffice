"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* Texto con una ayuda al pasar el mouse o con foco (sin depender del title nativo) */
export function Tip({ text, children, side = "top" }: { text: string; children: ReactNode; side?: "top" | "bottom" }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-[8px] bg-ink px-2.5 py-1.5 text-[12px] leading-[1.4] font-medium text-white opacity-0 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-opacity duration-150 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
        )}
      >
        {text}
      </span>
    </span>
  );
}

/* ═══════════════ Tooltips propios (en vez del "title" del navegador) ═══════════════ */

/*
 * Cualquier elemento con data-tip="…" muestra su ayuda al pasar el mouse o con el foco del teclado. El primero espera
 * un instante; si ya había uno abierto, el siguiente aparece al toque (se siente más rápido sin ser molesto).
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean; id: number } | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastHide = 0;
    let showing = false;
    let current: Element | null = null;
    const show = (el: Element) => {
      const text = el.getAttribute("data-tip");
      if (!text || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      const below = r.top < 56;
      showing = true;
      setTip({
        text,
        x: Math.max(12, Math.min(window.innerWidth - 12, r.left + r.width / 2)),
        y: below ? r.bottom + 8 : r.top - 8,
        below,
        id: Date.now(),
      });
    };
    const enter = (el: Element | null, instant = false) => {
      if (el === current) return;
      clearTimeout(timer);
      current = el;
      if (showing) lastHide = Date.now();
      showing = false;
      setTip(null);
      if (!el) return;
      const quick = instant || Date.now() - lastHide < 500;
      timer = setTimeout(() => show(el), quick ? 0 : 420);
    };
    const over = (e: PointerEvent) =>
      e.pointerType === "mouse" && enter((e.target as Element).closest?.("[data-tip]") ?? null);
    const focus = (e: FocusEvent) => {
      const el = (e.target as Element).closest?.("[data-tip]");
      if (el && (e.target as HTMLElement).matches(":focus-visible")) enter(el, true);
    };
    const blur = () => enter(null);
    const hide = () => {
      clearTimeout(timer);
      current = null;
      showing = false;
      setTip(null);
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("pointerdown", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("pointerdown", hide);
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.id}
          role="tooltip"
          className="pointer-events-none fixed z-[99] max-w-[260px] rounded-[9px] bg-ink px-2.5 py-1.5 text-[12.5px] leading-[1.35] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          style={{
            left: tip.x,
            top: tip.y,
            translateX: "-50%",
            translateY: tip.below ? "0%" : "-100%",
            transformOrigin: tip.below ? "50% 0%" : "50% 100%",
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.14, ease: EASE_OUT }}
        >
          {tip.text}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
