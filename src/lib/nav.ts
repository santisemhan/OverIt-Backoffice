import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/*
 * Single source of the back office navigation: areas (violet rail) → groups (collapsible titles) → sections.
 * The sidebar, the mobile top bar, the ⌘K palette and the page titles all read from here. To add a section, add it
 * here and create its page at `/${area}/${section}`.
 */

export type AreaId = "trackeo" | "moderacion" | "contenido";

/** Counters shown next to a section. Values come from `useNavBadges` (components/shell/useNavBadges.ts). */
export type NavBadge = "review" | "inbox" | "challenges" | "breaths" | "articles" | "phrases" | "facts";

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
    id: "trackeo",
    label: "Trackeo",
    icon: Icon.overview,
    hint: "Números de Over It: descargas, onboarding, ventas y uso",
    groups: [
      {
        id: "negocio",
        label: "Negocio",
        items: [
          { id: "resumen", label: "Resumen", icon: Icon.overview, hint: "Lo más importante en una pantalla" },
          {
            id: "onboarding",
            label: "Onboarding",
            icon: Icon.funnel,
            hint: "Pantalla por pantalla: quién llega y quién se va",
          },
          {
            id: "suscripciones",
            label: "Suscripciones",
            icon: Icon.card,
            hint: "Quién renueva, quién cancela y por qué",
          },
        ],
      },
      {
        id: "personas",
        label: "Personas",
        items: [
          { id: "usuarios", label: "Usuarios", icon: Icon.users, hint: "Cada persona y todo lo que hizo" },
          { id: "uso", label: "Uso de la app", icon: Icon.leaf, hint: "Qué usan adentro de la app" },
        ],
      },
    ],
  },
  {
    id: "moderacion",
    label: "Moderación",
    icon: Icon.shield,
    hint: "Comunidad, reportes y conversaciones con Ninety",
    groups: [
      {
        id: "revision",
        label: "Revisión",
        items: [
          {
            id: "comunidad",
            label: "Comunidad",
            icon: Icon.community,
            badge: "review",
            hint: "Lo que publican y comentan",
          },
          {
            id: "reportes",
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
        id: "equipo",
        label: "Equipo",
        items: [
          {
            id: "historial",
            label: "Historial",
            icon: Icon.history,
            hint: "Cada cambio del equipo, con quién y cuándo",
          },
        ],
      },
    ],
  },
  {
    id: "contenido",
    label: "Contenido",
    icon: Icon.book,
    hint: "Lo que se ve en la app: retos, recursos y textos",
    groups: [
      {
        id: "camino",
        label: "Camino de 90 días",
        items: [
          {
            id: "retos",
            label: "Retos diarios",
            icon: Icon.flame,
            badge: "challenges",
            hint: "Un reto por día, en orden",
          },
        ],
      },
      {
        id: "recursos",
        label: "Recursos",
        items: [
          {
            id: "respiraciones",
            label: "Respiraciones",
            icon: Icon.wind,
            badge: "breaths",
            hint: "Ejercicios de respiración guiados",
          },
          {
            id: "articulos",
            label: "Artículos & Tips",
            icon: Icon.book,
            badge: "articles",
            hint: "Lecturas cortas con bloques",
          },
          {
            id: "frases",
            label: "Frases",
            icon: Icon.quote,
            badge: "phrases",
            hint: "Una por día, en el orden de la lista",
          },
        ],
      },
      {
        id: "home",
        label: "Home",
        items: [
          { id: "datos", label: "Datos científicos", icon: Icon.brain, badge: "facts", hint: "Uno por día en la home" },
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

/** Area and section for a pathname such as /trackeo/usuarios/123. Falls back to the first section of Trackeo. */
export function locate(pathname: string): { area: Area; section: NavItem } {
  const [a, s] = pathname.split("/").filter(Boolean);
  const area = AREAS.find((x) => x.id === a) ?? AREAS[0];
  const section = SECTIONS[area.id].find((x) => x.id === s) ?? SECTIONS[area.id][0];
  return { area, section };
}

/** Lookup for a page header: `section("trackeo", "usuarios")`. Throws on a typo so it fails at build time. */
export function section(area: AreaId, id: string): NavItem {
  const item = SECTIONS[area].find((x) => x.id === id);
  if (!item) throw new Error(`Unknown section ${area}/${id}`);
  return item;
}
