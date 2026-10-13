import type { ReactNode, SVGProps } from "react";

/* Íconos del Back Office: trazo 1.8, puntas redondeadas, 24×24 (misma familia que los de la app) */

type P = SVGProps<SVGSVGElement> & { size?: number };
const I = ({ size = 20, children, ...rest }: P & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...rest}
  >
    {children}
  </svg>
);

export const Icon = {
  overview: (p: P) => (
    <I {...p}>
      <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" />
    </I>
  ),
  funnel: (p: P) => (
    <I {...p}>
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
    </I>
  ),
  users: (p: P) => (
    <I {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
    </I>
  ),
  leaf: (p: P) => (
    <I {...p}>
      <path d="M5 19c0-8 5-13 15-14-.5 10-6 15-14 15" />
      <path d="M5 19c3-4 6-7 10-9" />
    </I>
  ),
  card: (p: P) => (
    <I {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h4" />
    </I>
  ),
  chat: (p: P) => (
    <I {...p}>
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" />
    </I>
  ),
  community: (p: P) => (
    <I {...p}>
      <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M19 9h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2.5L16 19h-3" />
    </I>
  ),
  inbox: (p: P) => (
    <I {...p}>
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
      <path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
    </I>
  ),
  book: (p: P) => (
    <I {...p}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v14" />
    </I>
  ),
  history: (p: P) => (
    <I {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3 4v4h4M12 8v4.5l3 2" />
    </I>
  ),
  search: (p: P) => (
    <I {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </I>
  ),
  x: (p: P) => (
    <I {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </I>
  ),
  check: (p: P) => (
    <I {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </I>
  ),
  chevron: (p: P) => (
    <I {...p}>
      <path d="m9 6 6 6-6 6" />
    </I>
  ),
  chevronDown: (p: P) => (
    <I {...p}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
  back: (p: P) => (
    <I {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </I>
  ),
  arrowRight: (p: P) => (
    <I {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </I>
  ),
  trash: (p: P) => (
    <I {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7" />
    </I>
  ),
  pencil: (p: P) => (
    <I {...p}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </I>
  ),
  plus: (p: P) => (
    <I {...p}>
      <path d="M12 5v14M5 12h14" />
    </I>
  ),
  flame: (p: P) => (
    <I {...p}>
      <path d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.4-2.2-5.6-3.6-7.2-.3 1.6-1.1 2.8-2.2 3.3.2-3.1-1.2-5.8-3.7-7.8.1 2.9-1.4 4.8-2.9 6.6-1.3 1.5-2.6 3.1-2.6 5.4C3.5 18.4 6.1 21 12 21z" />
      <path d="M12 21c-1.8 0-3-1.2-3-2.9 0-1.5 1.2-2.6 2.3-3.9.5 1.1 1.4 1.7 2.2 1.9.6-.8.9-1.7.9-2.6 1 1 1.6 2.3 1.6 3.6 0 2.2-1.6 3.9-4 3.9z" />
    </I>
  ),
  settings: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4z" />
    </I>
  ),
  grip: (p: P) => (
    <I {...p} strokeWidth={0} fill="currentColor">
      {[8, 16].map((x) => [6, 12, 18].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.6} />))}
    </I>
  ),
  minus: (p: P) => (
    <I {...p}>
      <path d="M6 12h12" />
    </I>
  ),
  copyPlus: (p: P) => (
    <I {...p}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5M14.5 12v5M12 14.5h5" />
    </I>
  ),
  move: (p: P) => (
    <I {...p}>
      <path d="M8 7 12 3l4 4M8 17l4 4 4-4M12 3v18" />
    </I>
  ),
  clock: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </I>
  ),
  lock: (p: P) => (
    <I {...p}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </I>
  ),
  rewind: (p: P) => (
    <I {...p}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />
      <path d="M4 4v4.5h4.5" />
    </I>
  ),
  shield: (p: P) => (
    <I {...p}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" />
    </I>
  ),
  home: (p: P) => (
    <I {...p}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19z" />
    </I>
  ),
  flag: (p: P) => (
    <I {...p}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </I>
  ),
  alert: (p: P) => (
    <I {...p}>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5v.1" />
    </I>
  ),
  bug: (p: P) => (
    <I {...p}>
      <rect x="7" y="8" width="10" height="12" rx="5" />
      <path d="M12 8V20M9 5.5 10.5 8M15 5.5 13.5 8M3 13h4M17 13h4M4 8l3 2M20 8l-3 2M4 19l3-2M20 19l-3-2" />
    </I>
  ),
  bulb: (p: P) => (
    <I {...p}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </I>
  ),
  door: (p: P) => (
    <I {...p}>
      <path d="M14 4H6v16h8M10 12h11M18 9l3 3-3 3" />
    </I>
  ),
  eye: (p: P) => (
    <I {...p}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </I>
  ),
  eyeOff: (p: P) => (
    <I {...p}>
      <path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6C3.8 8.5 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </I>
  ),
  mail: (p: P) => (
    <I {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </I>
  ),
  globe: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </I>
  ),
  calendar: (p: P) => (
    <I {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </I>
  ),
  heart: (p: P) => (
    <I {...p}>
      <path d="M12 20s-7.5-4.6-9.1-9.4C1.8 7.4 4 4.4 7.2 4.4c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.4 3 4.3 6.2C19.5 15.4 12 20 12 20z" />
    </I>
  ),
  wind: (p: P) => (
    <I {...p}>
      <path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7" />
    </I>
  ),
  quote: (p: P) => (
    <I {...p}>
      <path d="M9.5 7C6.5 8 5 10.2 5 13v4h5v-5H7.3c.2-1.6 1.1-2.7 2.7-3.3zM18.5 7c-3 1-4.5 3.2-4.5 6v4h5v-5h-2.7c.2-1.6 1.1-2.7 2.7-3.3z" />
    </I>
  ),
  brain: (p: P) => (
    <I {...p}>
      <path d="M12 5.8c-.9-1.5-3.3-1.9-4.7-.6-1.2 1.1-1.2 2.7-.7 3.6-1.5.5-2.3 2.2-1.7 3.7.4.9 1.1 1.4 1.9 1.6-.3 1.6.7 3.1 2.4 3.4 1.2.2 2.2-.3 2.8-1.2M12 5.8c.9-1.5 3.3-1.9 4.7-.6 1.2 1.1 1.2 2.7.7 3.6 1.5.5 2.3 2.2 1.7 3.7-.4.9-1.1 1.4-1.9 1.6.3 1.6-.7 3.1-2.4 3.4-1.2.2-2.2-.3-2.8-1.2M12 5.8v10.5" />
    </I>
  ),
  more: (p: P) => (
    <I {...p}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </I>
  ),
  logout: (p: P) => (
    <I {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
    </I>
  ),
  menu: (p: P) => (
    <I {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </I>
  ),
  up: (p: P) => (
    <I {...p}>
      <path d="m6 15 6-6 6 6" />
    </I>
  ),
  down: (p: P) => (
    <I {...p}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
  undo: (p: P) => (
    <I {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </I>
  ),
  table: (p: P) => (
    <I {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 9.5h18M3 14.5h18M9 9.5v10" />
    </I>
  ),
  link: (p: P) => (
    <I {...p}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </I>
  ),
  phone: (p: P) => (
    <I {...p}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </I>
  ),
  sort: (p: P) => (
    <I {...p}>
      <path d="M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5" />
    </I>
  ),
  bell: (p: P) => (
    <I {...p}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5h4" />
    </I>
  ),
  star: (p: P) => (
    <I {...p}>
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
    </I>
  ),
  copy: (p: P) => (
    <I {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </I>
  ),
};

/* La cara de Ninety (◠ ◡ ◠), la del ícono de la app y los avatares de la comunidad (HomeParts.tsx, NINETY_FACE) */
export const NINETY_FACE = [
  "M87 211.1A45.5 45.5 0 0 1 166.2 210.5",
  "M287 211.1A45.5 45.5 0 0 1 366.2 210.5",
  "M181.1 255.1A49.6 49.6 0 0 0 272.8 254.3",
];
