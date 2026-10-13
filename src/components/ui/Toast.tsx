"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ═══════════════ Avisos con "Deshacer" ═══════════════ */

type Toast = { id: number; text: string; undo?: () => void; tone?: "ok" | "bad" };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const reduce = useReducedMotion();
  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { ...t, id }]);
  }, []);
  const close = useCallback((id: number) => setList((l) => l.filter((x) => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:items-end md:pr-6"
      >
        <AnimatePresence initial={false}>
          {list.map((t) => (
            <ToastItem key={t.id} t={t} reduce={!!reduce} close={close} />
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ t, reduce, close }: { t: Toast; reduce: boolean; close: (id: number) => void }) {
  const [hover, setHover] = useState(false);
  const onClose = () => close(t.id);
  // `close` is stable, so showing another toast does not restart this one's timer.
  useEffect(() => {
    if (hover) return;
    const id = setTimeout(() => close(t.id), t.undo ? 6000 : 3800);
    return () => clearTimeout(id);
  }, [hover, close, t.id, t.undo]);
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="pointer-events-auto flex min-h-[48px] w-full max-w-[440px] items-center gap-3 rounded-[14px] bg-ink py-2 pr-2 pl-4 text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
      role="status"
    >
      <span
        className={cx(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full",
          t.tone === "bad" ? "bg-[#FE5858] text-white" : "bg-lime text-ink",
        )}
      >
        {t.tone === "bad" ? <Icon.alert size={13} strokeWidth={2.4} /> : <Icon.check size={13} strokeWidth={2.6} />}
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-[1.35] font-medium">{t.text}</span>
      {t.undo && (
        <button
          type="button"
          onClick={() => {
            t.undo!();
            onClose();
          }}
          className="h-[34px] shrink-0 press rounded-[10px] px-3 text-[13.5px] font-bold text-lime hover:bg-white/10"
        >
          Deshacer
        </button>
      )}
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={onClose}
        className="flex h-[30px] w-[30px] shrink-0 press items-center justify-center rounded-[9px] text-white/80 hover:bg-white/10 hover:text-white"
      >
        <Icon.x size={15} />
      </button>
    </motion.div>
  );
}
