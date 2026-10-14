"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";

/* ═══════════════ Franja que se desliza de costado ═══════════════ */

/*
 * Para tablas anchas y tiras de pantallas (2026-10-13: "las tablas no se pueden scrollear para los costados"). Siempre
 * se puede deslizar: con el trackpad, Shift + rueda, la barra fina de abajo, las flechas ‹ › que aparecen al pasar el
 * mouse, o el teclado (la franja toma foco y responde a ← →). Un degradé en el borde avisa que hay más contenido.
 * `data-l` / `data-r` dicen si hay contenido escondido a cada lado (las celdas fijas de una tabla lo usan para su sombra).
 */
export function HScroll({
  children,
  label,
  className,
  innerClassName,
  arrows = true,
  arrowTop,
  fade = "#FFFFFF",
  fadeLeft = true,
  scrollRef,
  arrowsRight = false,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  innerClassName?: string;
  arrows?: boolean;
  /** Altura de las flechas desde arriba (en una tabla, a la altura del encabezado); si no, al medio */
  arrowTop?: number;
  /** Color del fondo, para el degradé del borde */
  fade?: string;
  fadeLeft?: boolean;
  /** Para mover la franja desde afuera (por ejemplo, con flechas en el título del panel) */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Las dos flechas juntas a la derecha (en tablas con la primera columna fija, para no taparla) */
  arrowsRight?: boolean;
}) {
  const own = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? own;
  const [edge, setEdge] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge((e) => {
        const l = el.scrollLeft > 2;
        const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        return e.l === l && e.r === r ? e : { l, r };
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" });
  };
  const arrowPos = arrowTop === undefined ? "top-1/2 -translate-y-1/2" : "";
  const arrowBtn =
    "absolute z-[3] hidden h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-ink shadow-[0_0_0_1px_rgba(36,35,35,0.08),0_6px_16px_rgba(36,35,35,0.16)] opacity-0 transition-opacity duration-150 hover:text-purple focus-visible:opacity-100 group-hover/hs:opacity-100 md:flex";
  return (
    <div className={cx("group/hs relative min-w-0", className)} data-l={edge.l} data-r={edge.r}>
      <div
        ref={ref}
        tabIndex={edge.l || edge.r ? 0 : -1}
        role="region"
        aria-label={label}
        className={cx("overflow-x-auto overscroll-x-contain", innerClassName)}
      >
        {children}
      </div>
      {fadeLeft && (
        <span
          aria-hidden
          className={cx(
            "pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 transition-opacity duration-200",
            edge.l ? "opacity-100" : "opacity-0",
          )}
          style={{ background: `linear-gradient(90deg, ${fade}, ${fade}00)` }}
        />
      )}
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-y-0 right-0 z-[2] w-14 transition-opacity duration-200",
          edge.r ? "opacity-100" : "opacity-0",
        )}
        style={{ background: `linear-gradient(270deg, ${fade}, ${fade}00)` }}
      />
      {arrows && edge.l && (
        <button
          type="button"
          aria-label="Ver lo anterior"
          onClick={() => go(-1)}
          className={cx(arrowBtn, arrowPos, arrowsRight ? (edge.r ? "right-[48px]" : "right-2") : "left-2")}
          style={arrowTop === undefined ? undefined : { top: arrowTop }}
        >
          <Icon.back size={17} />
        </button>
      )}
      {arrows && edge.r && (
        <button
          type="button"
          aria-label="Ver lo que sigue"
          onClick={() => go(1)}
          className={cx(arrowBtn, arrowPos, "right-2")}
          style={arrowTop === undefined ? undefined : { top: arrowTop }}
        >
          <Icon.arrowRight size={17} />
        </button>
      )}
    </div>
  );
}
