"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

/*
 * Cierra con Escape solo lo de más arriba: menús, paneles y el menú del celular se apilan y Escape cierra el último
 * que se abrió. Si hay un diálogo nativo abierto (confirmaciones), Escape es suyo.
 */
const escStack: { current: () => void }[] = [];
let escBound = false;
function onEscKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  if (document.querySelector("dialog[open]")) return;
  const top = escStack[escStack.length - 1];
  if (top) {
    e.preventDefault();
    top.current();
  }
}
export function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  useEffect(() => {
    ref.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const entry = { current: () => ref.current() };
    escStack.push(entry);
    if (!escBound) {
      window.addEventListener("keydown", onEscKey);
      escBound = true;
    }
    return () => {
      const i = escStack.indexOf(entry);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [open]);
}

/* El foco no se escapa de un panel abierto: Tab y Shift+Tab dan la vuelta adentro */
export function trapFocus(e: ReactKeyboardEvent, root: HTMLElement | null) {
  if (e.key !== "Tab" || !root) return;
  const items = [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
