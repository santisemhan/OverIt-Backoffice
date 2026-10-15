"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, Stars } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { AREA, AREAS, SECTIONS, sectionHref, type AreaId, type NavItem } from "@/lib/nav";
import { loadPref, savePref } from "@/lib/prefs";
import { useNavBadges } from "./useNavBadges";

function useSearchShortcut() {
  return useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

/*
 * Desktop sidebar (and the content of the mobile drawer): a violet rail with the areas and the account,
 * plus a white panel with the area name, search and its sections in collapsible groups.
 */
export function Sidebar({
  areaId,
  sectionId,
  hrefFor,
  onSearch,
  onLogout,
  onClose,
}: {
  areaId: AreaId;
  sectionId: string;
  /** Section href, with the Tracking filters carried over when relevant. */
  hrefFor: (area: AreaId, section: string) => string;
  onSearch: () => void;
  onLogout: () => void;
  /** Present in the mobile drawer: shows a close button and closes on navigation. */
  onClose?: () => void;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const badges = useNavBadges();
  const shortcut = useSearchShortcut();
  const area = AREA[areaId];
  const pending = (badges.inbox ?? 0) + (badges.review ?? 0);

  /* Switching area opens the last section you looked at there. */
  const openArea = (id: AreaId) => {
    if (id === areaId) return;
    const last = loadPref<Record<string, string>>("nav:last", {})[id];
    const target = last && SECTIONS[id].some((x) => x.id === last) ? last : SECTIONS[id][0].id;
    router.push(hrefFor(id, target));
  };

  return (
    <div className="flex h-full">
      {/* Area rail */}
      <div className="on-violet relative flex w-[72px] shrink-0 flex-col items-center overflow-hidden bg-purple pt-[max(16px,env(safe-area-inset-top))] pb-4 text-white">
        <Stars />
        <Link
          href={sectionHref("tracking", "overview")}
          onClick={onClose}
          aria-label="Over It Back Office: ir al Resumen"
          className="relative press rounded-[13px]"
        >
          <Image
            src="/brand/app-icon.png"
            alt=""
            width={42}
            height={42}
            priority
            className="block h-[42px] w-[42px] rounded-[13px] shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_10px_22px_rgba(20,18,90,0.42)]"
          />
        </Link>
        <nav aria-label="Áreas" className="relative mt-6 flex flex-col items-center gap-2">
          {AREAS.map((a) => {
            const on = a.id === areaId;
            const dot = a.id === "moderation" && !on && pending > 0;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => openArea(a.id)}
                aria-current={on ? "true" : undefined}
                aria-label={dot ? `${a.label} (hay pendientes)` : a.label}
                className="group flex w-[64px] press flex-col items-center gap-1 rounded-[14px] py-1"
              >
                <span
                  className={cx(
                    "relative flex h-[42px] w-[42px] items-center justify-center rounded-[14px] transition-colors duration-200",
                    on
                      ? "bg-lime text-ink shadow-[0_6px_16px_rgba(20,18,90,0.25)]"
                      : "text-white group-hover:bg-white/14",
                  )}
                >
                  <a.icon size={21} />
                  {dot && (
                    <span
                      aria-hidden
                      className="absolute top-[6px] right-[6px] h-[9px] w-[9px] rounded-full bg-lime shadow-[0_0_0_2px_#5E5BE2]"
                    />
                  )}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "text-[10.5px] leading-none font-bold tracking-[-0.01em]",
                    on ? "text-white" : "text-white/85",
                  )}
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="flex-1" />
        <div className="relative flex flex-col items-center gap-2">
          <Menu
            label="Tu cuenta"
            align="start"
            trigger={<Avatar look="peach" size={36} />}
            triggerClassName="rounded-full p-[3px] hover:bg-white/14"
            header={
              <>
                <p className="truncate text-[13px] font-bold text-ink">{session?.displayName}</p>
                <p className="truncate text-[12px] font-medium text-ink-60">{`${session?.email} · ${session?.role}`}</p>
              </>
            }
            items={[{ label: "Cerrar sesión", icon: <Icon.logout size={17} />, onClick: onLogout }]}
          />
        </div>
      </div>

      {/* Area panel */}
      <div className="flex min-w-0 flex-1 flex-col bg-white shadow-[inset_-1px_0_0_#ECE9E2]">
        <div className="px-4 pt-[max(18px,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center gap-2">
            <Logo tone="dark" className="h-[17px] w-auto" />
            <span className="rounded-full bg-purple-10 px-2 py-0.5 text-[11px] font-bold text-purple">Back Office</span>
            {onClose && (
              <IconButton label="Cerrar menú" className="-mr-1.5 ml-auto" onClick={onClose}>
                <Icon.x size={20} />
              </IconButton>
            )}
          </div>
          <h2 className="mt-4 text-[22px] leading-none font-black tracking-[-0.025em] text-ink">{area.label}</h2>
          <p className="mt-1.5 text-[12.5px] leading-[1.4] font-medium text-ink-60">{area.hint}</p>
          <button
            type="button"
            onClick={onSearch}
            className="mt-3.5 flex h-[38px] w-full press items-center gap-2.5 rounded-[12px] bg-bo-soft px-3 text-left text-[13.5px] font-medium text-ink-60 shadow-[inset_0_0_0_1px_#ECE9E2] hover:text-ink"
          >
            <Icon.search size={17} />
            <span className="flex-1">Buscar</span>
            <kbd className="rounded-[6px] bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink-60 shadow-[inset_0_0_0_1px_#E3E0D9]">
              {shortcut}
            </kbd>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {area.groups.map((g) => (
            <NavGroupList
              key={`${areaId}-${g.id}`}
              id={`${areaId}:${g.id}`}
              label={g.label}
              items={g.items}
              current={sectionId}
              href={(s) => hrefFor(areaId, s)}
              badges={badges}
              onPick={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* A titled group of sections that collapses (remembered per browser). Collapsed, it still shows the current one. */
function NavGroupList({
  id,
  label,
  items,
  current,
  href,
  badges,
  onPick,
}: {
  id: string;
  label: string;
  items: NavItem[];
  current: string;
  href: (section: string) => string;
  badges: ReturnType<typeof useNavBadges>;
  onPick?: () => void;
}) {
  const [open, setOpen] = useState(() => !loadPref<string[]>("nav:closed", []).includes(id));
  const toggle = () => {
    const closed = loadPref<string[]>("nav:closed", []).filter((x) => x !== id);
    savePref("nav:closed", open ? [...closed, id] : closed);
    setOpen(!open);
  };
  const shown = open ? items : items.filter((it) => it.id === current);
  const listId = `nav-${id.replace(":", "-")}`;
  return (
    <section className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={listId}
        className="group flex h-[30px] w-full press items-center justify-between rounded-[9px] px-2.5 text-left"
      >
        <h3 className="text-[12px] font-bold text-ink-60 group-hover:text-ink">{label}</h3>
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-ink-60 group-hover:bg-ink/[0.06] group-hover:text-ink">
          {open ? <Icon.minus size={15} /> : <Icon.plus size={15} />}
        </span>
      </button>
      <ul id={listId} className="mt-0.5 space-y-0.5">
        {shown.map((it) => {
          const on = it.id === current;
          const count = it.badge ? (badges[it.badge] ?? 0) : 0;
          return (
            <li key={it.id}>
              <Link
                href={href(it.id)}
                onClick={onPick}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "flex h-[38px] w-full press items-center gap-2.5 rounded-[11px] px-2.5 text-left text-[14px] font-bold transition-colors duration-150",
                  on ? "bg-purple-10 text-purple" : "text-ink-70 hover:bg-[#F4F2ED] hover:text-ink",
                )}
              >
                <it.icon size={18} />
                <span className="flex-1 truncate">{it.label}</span>
                {count > 0 && (
                  <span
                    className={cx(
                      "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold tnum",
                      it.badge === "inbox"
                        ? "bg-lime font-black text-ink"
                        : it.badge === "review"
                          ? "bg-[#FDD9C9] font-black text-[#7A2E0E]"
                          : on
                            ? "bg-white text-purple"
                            : "bg-[#F0EEE9] text-ink-60",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
