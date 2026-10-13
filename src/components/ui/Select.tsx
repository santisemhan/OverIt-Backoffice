"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";
import { useEscape } from "@/lib/a11y";
import { Icon } from "./icons";

/*
 * Desplegable propio (reemplaza al <select> del sistema): la lista se abre debajo del botón (o arriba si no entra),
 * con la opción elegida tildada, la cantidad de cada opción a la derecha, buscador en las listas largas y todo el
 * teclado (flechas, Inicio/Fin, Enter, Escape, escribir para saltar). Accesible como listbox.
 */

export type SelectOption<T extends string> = {
  id: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
  divider?: boolean;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  hideLabel = true,
  search,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  label: string;
  className?: string;
  hideLabel?: boolean;
  /** Muestra un buscador arriba (texto de ayuda del campo) */
  search?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);
  const typed = useRef({ text: "", at: 0 });

  const shown = useMemo(
    () => (q.trim() ? options.filter((o) => norm(o.label).includes(norm(q.trim()))) : options),
    [options, q],
  );
  const current = options.find((o) => o.id === value);

  const close = useCallback((focus = true) => {
    setOpen(false);
    setQ("");
    if (focus) btn.current?.focus();
  }, []);
  useEscape(open, () => close(true));

  const openList = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.id === value),
      ),
    );
    setOpen(true);
  };
  const choose = (o: SelectOption<T>) => {
    onChange(o.id);
    close(true);
  };

  /* Dónde se abre: debajo si entra; si no, arriba. Nunca más ancho que la pantalla */
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const width = Math.min(window.innerWidth - 16, Math.max(r.width, 264));
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left));
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const want = Math.min(360, options.length * 38 + (search ? 52 : 0) + 12);
      const up = below < Math.min(want, 240) && above > below;
      const maxH = Math.max(160, Math.min(360, up ? above : below));
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxH });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, options.length, search]);

  /* Clic afuera o scroll de la página: se cierra (sin robar el foco) */
  useEffect(() => {
    if (!open) return;
    const down = (e: Event) => {
      if (panel.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      close(false);
    };
    const scroll = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return;
      close(false);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, close]);

  /* Al abrir, el foco va al buscador (o a la lista) */
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() =>
      (panel.current?.querySelector<HTMLElement>("input") ?? list.current)?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(t);
  }, [open]);

  /* La opción activa siempre a la vista */
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, pos]);

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter" || (e.key === " " && !search)) {
      e.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Tab") {
      close(false);
    } else if (!search && e.key.length === 1 && /\S/.test(e.key)) {
      /* Escribir salta a la opción que empieza así */
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = shown.findIndex((o) => norm(o.label).startsWith(norm(typed.current.text)));
      if (i >= 0) setActive(i);
    }
  };

  const h =
    size === "sm" ? "h-[34px] text-[13px] pl-3 pr-8 rounded-[10px]" : "h-[40px] text-[14px] pl-3.5 pr-9 rounded-[12px]";
  return (
    <div className={cx("relative", className)}>
      <span id={`${id}-label`} className={hideLabel ? "sr-only" : "mb-1.5 block text-[13px] font-bold text-ink-70"}>
        {label}
      </span>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close(true) : openList())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            openList();
          }
        }}
        className={cx(
          "relative flex w-full press items-center gap-2 bg-white text-left font-bold text-ink transition-shadow duration-150",
          h,
          open
            ? "shadow-[inset_0_0_0_2px_#5E5BE2,0_0_0_4px_rgba(94,91,226,0.12)]"
            : "shadow-[inset_0_0_0_1px_#E3E0D9] hover:shadow-[inset_0_0_0_1px_#CFCBC2]",
        )}
      >
        {current?.icon && <span className="shrink-0 text-ink-60">{current.icon}</span>}
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
          {current?.label ?? "Elegir"}
        </span>
        <Icon.chevronDown
          size={16}
          strokeWidth={2.2}
          className={cx(
            "pointer-events-none absolute text-ink-60 transition-transform duration-200 ease-[var(--ease-out)]",
            size === "sm" ? "right-2.5" : "right-3",
            open && "rotate-180 text-purple",
          )}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={panel}
                className="fixed z-[95] flex flex-col overflow-hidden rounded-[16px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(36,35,35,0.06),0_16px_40px_rgba(36,35,35,0.16)]"
                style={{
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxH,
                  ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                  transformOrigin: pos.up ? "50% 100%" : "50% 0%",
                }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: pos.up ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
                onKeyDown={onListKey}
              >
                {search && (
                  <div className="relative mb-1 shrink-0">
                    <Icon.search
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-60"
                    />
                    <input
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setActive(0);
                      }}
                      placeholder={search}
                      aria-label={search}
                      aria-controls={`${id}-list`}
                      aria-activedescendant={shown[active] ? `${id}-o-${active}` : undefined}
                      className="h-[36px] w-full rounded-[10px] bg-bo-soft pr-3 pl-8 text-[13.5px] font-medium text-ink shadow-[inset_0_0_0_1px_#EFEDE7] placeholder:text-ink-60 focus-visible:shadow-[inset_0_0_0_1.5px_#5E5BE2] focus-visible:outline-none"
                    />
                  </div>
                )}
                <ul
                  ref={list}
                  id={`${id}-list`}
                  role="listbox"
                  tabIndex={-1}
                  aria-labelledby={`${id}-label`}
                  aria-activedescendant={shown[active] ? `${id}-o-${active}` : undefined}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
                >
                  {shown.length ? (
                    shown.map((o, i) => {
                      const sel = o.id === value;
                      const act = i === active;
                      return (
                        <li key={o.id}>
                          <div
                            id={`${id}-o-${i}`}
                            data-i={i}
                            role="option"
                            aria-selected={sel}
                            onPointerMove={() => active !== i && setActive(i)}
                            onClick={() => choose(o)}
                            className={cx(
                              "flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] transition-colors duration-100 select-none",
                              act ? "bg-purple-10" : "",
                              sel ? "font-bold text-purple" : "font-medium text-ink",
                            )}
                          >
                            {o.icon && (
                              <span className={cx("shrink-0", sel ? "text-purple" : "text-ink-60")}>{o.icon}</span>
                            )}
                            <span className="min-w-0 flex-1 truncate">{o.label}</span>
                            {o.hint && (
                              <span
                                className={cx(
                                  "shrink-0 text-[12px] font-bold tnum",
                                  sel ? "text-purple/70" : "text-ink-60",
                                )}
                              >
                                {o.hint}
                              </span>
                            )}
                            <span className="flex w-[16px] shrink-0 justify-end">
                              {sel && <Icon.check size={16} strokeWidth={2.6} />}
                            </span>
                          </div>
                          {o.divider && !q && <div className="mx-2 my-1 h-px bg-bo-line" />}
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-3 py-6 text-center text-[13px] font-medium text-ink-60">{`Nada coincide con “${q}”`}</li>
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
