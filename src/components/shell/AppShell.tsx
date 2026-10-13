"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { LOGIN_PATH, useAuth } from "@/components/AuthProvider";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { filtersQuery } from "@/lib/filters";
import { locate, sectionHref, type AreaId } from "@/lib/nav";
import { loadPref, savePref } from "@/lib/prefs";
import { CommandPalette } from "./CommandPalette";
import { MobileMenu, TopBar } from "./MobileNav";
import { Sidebar } from "./Sidebar";

/*
 * Layout of the signed-in area: fixed sidebar from 1280px, violet top bar + drawer below it, ⌘K palette and the
 * logout confirmation. Area and section come from the pathname (lib/nav.ts).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { signOut } = useAuth();
  const { area, section } = locate(pathname);
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [logout, setLogout] = useState(false);

  /* Trackeo links keep the current period/country/language */
  const query = filtersQuery(params);
  const hrefFor = useCallback((a: AreaId, s: string) => sectionHref(a, s) + (a === "trackeo" ? query : ""), [query]);

  /* Each area remembers the last section you looked at */
  useEffect(() => {
    savePref("nav:last", { ...loadPref<Record<string, string>>("nav:last", {}), [area.id]: section.id });
  }, [area.id, section.id]);

  /* ⌘K / Ctrl+K, or "/" outside a field, toggles the palette */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable=true]");
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const nav = {
    areaId: area.id,
    sectionId: section.id,
    hrefFor,
    onSearch: () => setPalette(true),
    onLogout: () => setLogout(true),
  };

  return (
    <div className="min-h-dvh bg-bo-bg xl:pl-[316px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[316px] xl:block">
        <Sidebar {...nav} />
      </aside>

      <TopBar {...nav} onMenu={() => setMenu(true)} />
      <AnimatePresence>{menu && <MobileMenu {...nav} onClose={() => setMenu(false)} />}</AnimatePresence>

      <main className="@container mx-auto w-full max-w-[1280px] px-4 pt-5 pb-24 sm:px-6 xl:px-9 xl:pt-8">
        <div key={pathname} className="fade-in">
          {children}
        </div>
      </main>

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <ConfirmDialog
        open={logout}
        title="¿Cerrar sesión?"
        text="Vas a tener que volver a entrar con tu email y contraseña."
        confirm="Cerrar sesión"
        tone="primary"
        onClose={() => setLogout(false)}
        onConfirm={() => {
          setLogout(false);
          signOut();
          router.replace(LOGIN_PATH);
        }}
      />
    </div>
  );
}
