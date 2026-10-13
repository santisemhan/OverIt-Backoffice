"use client";

import { cx } from "@/lib/cx";
import { NINETY_FACE } from "./icons";

/** Avatar colours of the app (Perfil → "Elige tu avatar"). */
export type Look = "peach" | "mint" | "ink" | "violet" | "lime" | "lilac";
export const LOOK_COLORS: Record<Look, { bg: string; face: string }> = {
  peach: { bg: "#FBA078", face: "#E9FF70" },
  mint: { bg: "#DFF2D8", face: "#5E5BE2" },
  ink: { bg: "#242323", face: "#E9FF70" },
  violet: { bg: "#5E5BE2", face: "#E9FF70" },
  lime: { bg: "#E9FF70", face: "#5E5BE2" },
  lilac: { bg: "#DFDEF9", face: "#5E5BE2" },
};

/* ═══════════════ Personas y pantallas ═══════════════ */

/* El avatar de la app: la cara de Ninety sobre el color que eligió (Perfil → "Elige tu avatar:") */
export function Avatar({ look, size = 36, muted = false }: { look: Look; size?: number; muted?: boolean }) {
  const a = LOOK_COLORS[look];
  const fw = size * 0.6;
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: muted ? "#E6E3DC" : a.bg,
        boxShadow:
          look === "mint" || look === "lime" || look === "lilac" ? "inset 0 0 0 1px rgba(94,91,226,0.08)" : undefined,
      }}
    >
      <svg
        width={fw}
        height={(fw * 81) / 298}
        viewBox="78 192 298 81"
        fill="none"
        stroke={muted ? "#A19F9F" : a.face}
        strokeWidth={size < 32 ? 28 : 22}
        strokeLinecap="round"
        className="overflow-visible"
      >
        {NINETY_FACE.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

/* Captura de una pantalla de la app en un marco de teléfono */
export function PhoneShot({
  src,
  alt,
  width = 120,
  className,
  dim = false,
  ring,
}: {
  src: string;
  alt: string;
  width?: number;
  className?: string;
  dim?: boolean;
  ring?: "purple" | "bad" | "lime" | null;
}) {
  const r = Math.round(width * 0.14);
  const ringCls =
    ring === "purple"
      ? "ring-[2.5px] ring-purple"
      : ring === "bad"
        ? "ring-[2.5px] ring-bad"
        : ring === "lime"
          ? "ring-[3px] ring-lime"
          : "";
  return (
    <span
      className={cx(
        "relative block shrink-0 overflow-hidden bg-cream shadow-[0_0_0_1px_rgba(36,35,35,0.08),0_6px_16px_rgba(36,35,35,0.10)]",
        ringCls,
        className,
      )}
      style={{ width, height: Math.round((width * 852) / 393), borderRadius: r }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- capturas estáticas, tamaño fijo */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={Math.round((width * 852) / 393)}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cx("h-full w-full object-cover transition-opacity duration-200", dim && "opacity-45")}
      />
    </span>
  );
}
