"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/Logo";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { trapFocus, useEscape } from "@/lib/a11y";
import { cx } from "@/lib/cx";
import { AREA, SECTIONS, type AreaId } from "@/lib/nav";
import { Sidebar } from "./Sidebar";

/* Below 1280px: violet top bar with the current area and its sections as a horizontally scrollable strip. */
export function TopBar({
  areaId,
  sectionId,
  hrefFor,
  onMenu,
  onSearch,
}: {
  areaId: AreaId;
  sectionId: string;
  hrefFor: (area: AreaId, section: string) => string;
  onMenu: () => void;
  onSearch: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ l: false, r: true });
  const A = AREA[areaId];

  /* The current section always in view (centred) */
  useEffect(() => {
    const el = navRef.current;
    const cur = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && cur) el.scrollTo({ left: cur.offsetLeft - el.clientWidth / 2 + cur.clientWidth / 2, behavior: "smooth" });
  }, [areaId, sectionId]);

  const onScroll = () => {
    const el = navRef.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  const mask = `linear-gradient(90deg, ${edge.l ? "transparent 0, #000 28px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 36px), transparent 100%" : "#000 100%"})`;

  return (
    <header className="on-violet sticky top-0 z-30 bg-purple text-white xl:hidden">
      <div className="relative flex h-[56px] items-center gap-2 px-3 sm:px-5">
        <IconButton label="Abrir menú" tone="onViolet" onClick={onMenu}>
          <Icon.menu size={21} />
        </IconButton>
        <Logo tone="light" className="h-[20px] w-auto" />
        <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold sm:inline">Back Office</span>
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton label="Buscar" tone="onViolet" onClick={onSearch}>
            <Icon.search size={20} />
          </IconButton>
          <button
            type="button"
            onClick={onMenu}
            className="flex h-[36px] press items-center gap-1.5 rounded-full bg-white/14 pr-2 pl-2.5 text-[13.5px] font-bold text-white hover:bg-white/20"
          >
            <A.icon size={16} />
            {A.label}
            <Icon.chevronDown size={15} />
          </button>
        </div>
      </div>
      <nav
        ref={navRef}
        onScroll={onScroll}
        aria-label={A.label}
        className="no-scrollbar overflow-x-auto px-2 pb-2.5 sm:px-4"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <ul className="flex min-w-max gap-1">
          {SECTIONS[areaId].map((item) => {
            const on = item.id === sectionId;
            return (
              <li key={item.id}>
                <Link
                  href={hrefFor(areaId, item.id)}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex h-[34px] press items-center gap-1.5 rounded-full px-3 text-[13.5px] font-bold",
                    on ? "bg-lime text-ink" : "text-white hover:bg-white/12",
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

/* The same sidebar in a drawer from the left. */
export function MobileMenu({
  onClose,
  ...sidebar
}: Omit<ComponentProps<typeof Sidebar>, "onClose"> & { onClose: () => void }) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useEscape(true, onClose);

  /* Focus goes to the current section and back to ☰ on close; the page behind does not scroll */
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() =>
      (
        root.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
        root.current?.querySelector<HTMLElement>("button")
      )?.focus(),
    );
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = "";
      back?.focus?.();
    };
  }, []);

  return (
    <div
      ref={root}
      onKeyDown={(e) => trapFocus(e, root.current)}
      className="fixed inset-0 z-50 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
    >
      <motion.div
        className="absolute inset-0 bg-ink/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="absolute inset-y-0 left-0 w-[min(336px,92vw)] shadow-[12px_0_40px_rgba(0,0,0,0.2)]"
        initial={reduce ? { opacity: 0 } : { x: "-100%" }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: "-100%", transition: { duration: 0.2 } }}
        transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
      >
        <Sidebar
          {...sidebar}
          onClose={onClose}
          onSearch={() => {
            onClose();
            sidebar.onSearch();
          }}
          onLogout={() => {
            onClose();
            sidebar.onLogout();
          }}
        />
      </motion.div>
    </div>
  );
}
