"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { trapFocus, useEscape } from "@/lib/a11y";
import { cx } from "@/lib/cx";
import { AREAS, sectionHref } from "@/lib/nav";
import { usePaletteUsers, type PaletteItem } from "./usePaletteUsers";

/*
 * Quick search (⌘K / Ctrl+K, or "/"): type a section (and, once wired, a person's name, email or #ID) and go
 * straight there. No opening animation: it is used many times a day and has to feel instant.
 */

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const SECTION_ITEMS: PaletteItem[] = AREAS.flatMap((a) =>
  a.groups
    .flatMap((g) => g.items)
    .map((n) => ({
      id: `s-${a.id}-${n.id}`,
      group: "Secciones" as const,
      label: n.label,
      sub: a.label,
      icon: <n.icon size={18} />,
      href: sectionHref(a.id, n.id),
    })),
);

/** Mounted only while open, so every opening starts with an empty query. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const users = usePaletteUsers(q.trim().replace(/^#/, ""));
  useEscape(true, onClose);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => back?.focus?.({ preventScroll: true });
  }, []);

  const items = useMemo(() => {
    const text = norm(q).replace(/^#/, "");
    const sections = text ? SECTION_ITEMS.filter((s) => norm(`${s.label} ${s.sub}`).includes(text)) : SECTION_ITEMS;
    return [...sections, ...users.items];
  }, [q, users.items]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (it: PaletteItem) => {
    onClose();
    router.push(it.href);
  };
  const onKey = (e: KeyboardEvent) => {
    trapFocus(e, box.current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      pick(items[active]);
    }
  };

  let lastGroup = "";
  return createPortal(
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="absolute inset-0 bg-ink/35" onClick={onClose} />
      <div
        ref={box}
        onKeyDown={onKey}
        className="absolute top-[10vh] left-1/2 flex max-h-[76vh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_rgba(36,35,35,0.06),0_30px_80px_rgba(20,18,60,0.30)]"
      >
        <div className="flex items-center gap-3 border-b border-bo-line px-5">
          <Icon.search size={20} className="shrink-0 text-purple" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Buscá una persona (nombre, email o #ID) o una sección"
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pal-${active}` : undefined}
            className="h-[60px] min-w-0 flex-1 bg-transparent text-[16px] font-medium text-ink placeholder:text-ink-60 focus-visible:outline-none"
          />
          <kbd className="hidden rounded-[7px] bg-[#F0EEE9] px-2 py-1 text-[11.5px] font-bold text-ink-60 sm:block">
            Esc
          </kbd>
        </div>
        <ul
          ref={list}
          id="palette-list"
          role="listbox"
          aria-label="Resultados"
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {items.length ? (
            items.map((it, i) => {
              const header = it.group !== lastGroup ? (lastGroup = it.group) : null;
              return (
                <li key={it.id}>
                  {header && (
                    <p className="px-3 pt-3 pb-1.5 text-[11.5px] font-bold tracking-[0.06em] text-ink-60 uppercase">
                      {header === "Usuarios" && !q.trim() ? "Activos hace poco" : header}
                    </p>
                  )}
                  <div
                    id={`pal-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={i === active}
                    onPointerMove={() => active !== i && setActive(i)}
                    onClick={() => pick(it)}
                    className={cx(
                      "flex h-[48px] cursor-pointer items-center gap-3 rounded-[12px] px-3",
                      i === active && "bg-purple-10",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]",
                        it.group === "Secciones" &&
                          (i === active ? "bg-purple text-white" : "bg-[#F0EEE9] text-ink-70"),
                      )}
                    >
                      {it.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold text-ink">{it.label}</span>
                      <span className="block truncate text-[12px] font-medium text-ink-60">{it.sub}</span>
                    </span>
                    {i === active && <Icon.arrowRight size={16} className="shrink-0 text-purple" />}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-4 py-12 text-center">
              <p className="text-[15px] font-bold text-ink">
                {users.loading ? "Buscando…" : `Nada coincide con “${q}”`}
              </p>
              {!users.loading && (
                <p className="mt-1 text-[13px] font-medium text-ink-60">
                  Probá con otro nombre, un email o el número de ID.
                </p>
              )}
            </li>
          )}
        </ul>
        <div className="hidden items-center gap-4 border-t border-bo-line bg-bo-soft px-5 py-2.5 text-[12px] font-bold text-ink-60 sm:flex">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> para moverte
          </span>
          <span>
            <Kbd>Enter</Kbd> para abrir
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-[6px] bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink-70 shadow-[inset_0_0_0_1px_#E3E0D9]">
    {children}
  </kbd>
);
