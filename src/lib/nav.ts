import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/*
 * Single source of the back office navigation: areas (violet rail) → groups (collapsible titles) → sections.
 * The sidebar, the mobile top bar, the ⌘K palette and the page titles all read from here. To add a section, add it
 * here and create its page at `/${area}/${section}`.
 */

export type AreaId = "tracking" | "moderation";

/** Counters shown next to a section. Values come from `useNavBadges` (components/shell/useNavBadges.ts). */
export type NavBadge = "review" | "inbox";

type IconComponent = (p: { size?: number }) => ReactNode;

export interface NavItem {
  id: string;
  label: string;
  icon: IconComponent;
  hint?: string;
  badge?: NavBadge;
}
export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}
export interface Area {
  id: AreaId;
  label: string;
  icon: IconComponent;
  hint: string;
  groups: NavGroup[];
}

export const AREAS: Area[] = [
  {
    id: "tracking",
    label: "Trackeo",
    icon: Icon.overview,
    hint: "Números de Over It: descargas, onboarding, ventas y uso",
    groups: [
      {
        id: "business",
        label: "Negocio",
        items: [
          { id: "overview", label: "Resumen", icon: Icon.overview, hint: "Lo más importante en una pantalla" },
          {
            id: "onboarding",
            label: "Onboarding",
            icon: Icon.funnel,
            hint: "Pantalla por pantalla: quién llega y quién se va",
          },
          {
            id: "subscriptions",
            label: "Suscripciones",
            icon: Icon.card,
            hint: "Quién renueva, quién cancela y por qué",
          },
        ],
      },
      {
        id: "people",
        label: "Personas",
        items: [
          { id: "users", label: "Usuarios", icon: Icon.users, hint: "Cada persona y todo lo que hizo" },
          { id: "usage", label: "Uso de la app", icon: Icon.leaf, hint: "Qué usan adentro de la app" },
        ],
      },
    ],
  },
  {
    id: "moderation",
    label: "Moderación",
    icon: Icon.shield,
    hint: "Comunidad, reportes y conversaciones con Ninety",
    groups: [
      {
        id: "review",
        label: "Revisión",
        items: [
          {
            id: "community",
            label: "Comunidad",
            icon: Icon.community,
            badge: "review",
            hint: "Lo que publican y comentan",
          },
          {
            id: "reports",
            label: "Reportes y feedback",
            icon: Icon.inbox,
            badge: "inbox",
            hint: "Todo lo que mandan los usuarios",
          },
        ],
      },
      {
        id: "chatbot",
        label: "Chatbot",
        items: [{ id: "ninety", label: "Ninety", icon: Icon.chat, hint: "Cómo usan el chatbot" }],
      },
      {
        id: "team",
        label: "Equipo",
        items: [
          {
            id: "history",
            label: "Historial",
            icon: Icon.history,
            hint: "Cada cambio del equipo, con quién y cuándo",
          },
        ],
      },
    ],
  },
];

export const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>;

/** Every section of an area, in order. */
export const SECTIONS = Object.fromEntries(AREAS.map((a) => [a.id, a.groups.flatMap((g) => g.items)])) as Record<
  AreaId,
  NavItem[]
>;

export const sectionHref = (area: AreaId, section: string) => `/${area}/${section}`;

/** Area and section for a pathname such as /tracking/users/123. Falls back to the first section of Tracking. */
export function locate(pathname: string): { area: Area; section: NavItem } {
  const [a, s] = pathname.split("/").filter(Boolean);
  const area = AREAS.find((x) => x.id === a) ?? AREAS[0];
  const section = SECTIONS[area.id].find((x) => x.id === s) ?? SECTIONS[area.id][0];
  return { area, section };
}

/** Lookup for a page header: `section("tracking", "users")`. Throws on a typo so it fails at build time. */
export function section(area: AreaId, id: string): NavItem {
  const item = SECTIONS[area].find((x) => x.id === id);
  if (!item) throw new Error(`Unknown section ${area}/${id}`);
  return item;
}
