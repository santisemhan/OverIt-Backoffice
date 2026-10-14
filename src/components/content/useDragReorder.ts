"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export const moveIndex = <T>(arr: T[], from: number, to: number) => {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

export type DragState = { id: string; from: number; to: number };

/*
 * Reorder a list by dragging its ⠿ handle (mouse or finger) or with ↑ ↓ on the focused handle. Rows must carry
 * `data-index` (their index in the full list) and handles `data-handle={id}`. While dragging, `preview(list)` returns
 * the list as it would end up, so day numbers can update live. Escape cancels; near the window edge the page scrolls.
 */
export function useDragReorder({
  count,
  enabled,
  listRef,
  onMove,
}: {
  count: number;
  enabled: boolean;
  listRef: RefObject<HTMLElement | null>;
  onMove: (from: number, to: number) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef(drag);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    dragRef.current = drag;
    onMoveRef.current = onMove;
  });
  const pointerY = useRef(0);

  const startDrag = (e: ReactPointerEvent, index: number, id: string) => {
    if (!enabled || e.button !== 0) return;
    e.preventDefault();
    pointerY.current = e.clientY;
    const d = { id, from: index, to: index };
    dragRef.current = d;
    setDrag(d);
  };

  const dragId = drag?.id;
  useEffect(() => {
    if (!dragId) return;
    const findTarget = () => {
      const d = dragRef.current;
      const box = listRef.current;
      if (!d || !box) return;
      const rows = [...box.querySelectorAll<HTMLElement>("[data-index]")];
      if (!rows.length) return;
      const y = pointerY.current;
      let to = d.to;
      const first = rows[0].getBoundingClientRect();
      const last = rows[rows.length - 1].getBoundingClientRect();
      if (y < first.top) to = Number(rows[0].dataset.index);
      else if (y > last.bottom) to = Number(rows[rows.length - 1].dataset.index);
      else
        for (const el of rows) {
          const r = el.getBoundingClientRect();
          if (y >= r.top && y <= r.bottom) to = Number(el.dataset.index);
        }
      if (to !== d.to) {
        const next = { ...d, to };
        dragRef.current = next;
        setDrag(next);
      }
    };
    const move = (e: PointerEvent) => {
      pointerY.current = e.clientY;
      findTarget();
    };
    let raf = 0;
    const tick = () => {
      const y = pointerY.current;
      const top = window.innerWidth < 1280 ? 130 : 70;
      const bottom = window.innerHeight - 70;
      const v = y < top ? -Math.min(22, (top - y) / 3 + 4) : y > bottom ? Math.min(22, (y - bottom) / 3 + 4) : 0;
      if (v) {
        window.scrollBy(0, v);
        findTarget();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d && d.to !== d.from) onMoveRef.current(d.from, d.to);
    };
    const cancel = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", cancel);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", cancel);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragId, listRef]);

  const keyMove = (e: ReactKeyboardEvent, index: number, id: string) => {
    if (!enabled || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const to = index + (e.key === "ArrowUp" ? -1 : 1);
    if (to < 0 || to >= count) return;
    onMove(index, to);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus());
  };

  const preview = <T>(list: T[]) => (drag ? moveIndex(list, drag.from, drag.to) : list);

  return { drag, startDrag, keyMove, preview };
}

/** Scroll a row into view and flash it for a moment. */
export function flashRow(elementId: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  });
}
