/*
 * Over It wordmark, rebuilt as 14px monoline strokes (ported from the onboarding prototype).
 * `light` is for violet backgrounds (white + lime); `dark` for light surfaces (ink + violet).
 */

const OVER: { d: string; join?: "bevel"; width?: number }[] = [
  { d: "M195.3,30 L240.5,145.2 L285.7,30", join: "bevel", width: 14.6 },
  { d: "M378,46.8 H303.5 V142.6 H378" },
  { d: "M303.5,94.7 H362.5" },
  { d: "M297,179.8 H378" },
  { d: "M393.6,40 V187" },
  { d: "M393.6,46.8 H435.2 A40.6,40.6 0 0 1 435.2,128 H393.6" },
  { d: "M425,127 C438,150 446,179.8 470,179.8 H519.5" },
];
const IT = ["M512.7,40 V149.5", "M549.6,53 V168 Q549.6,179.8 561,179.8 H580.8", "M529,85.7 H580.8"];

const TONES = {
  light: { main: "#FFFFFF", accent: "#CFF937" },
  dark: { main: "#242323", accent: "#5E5BE2" },
};

export function Logo({ tone = "dark", className }: { tone?: keyof typeof TONES; className?: string }) {
  const c = TONES[tone];
  return (
    <svg viewBox="42 38 541 151" className={className} role="img" aria-label="Over It" overflow="visible">
      <defs>
        <clipPath id={`logo-clip-${tone}`}>
          <rect x="0" y="40" width="625" height="147" />
        </clipPath>
      </defs>
      <g fill="none" stroke={c.main} strokeWidth={14} clipPath={`url(#logo-clip-${tone})`}>
        <circle cx="117.4" cy="113.4" r="66.6" />
        {OVER.map((s) => (
          <path key={s.d} d={s.d} strokeLinejoin={s.join ?? "miter"} strokeWidth={s.width} />
        ))}
      </g>
      <g fill="none" stroke={c.accent} strokeWidth={14}>
        {IT.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

/* The brand star pattern (as on the app splash), as a faint mask over violet surfaces. */
export function Stars({ full = false }: { full?: boolean }) {
  const m = full
    ? { size: "cover", repeat: "no-repeat", position: "center" }
    : { size: "420px auto", repeat: "repeat-y", position: "-40px -60px" };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{
        backgroundColor: "#fff",
        maskImage: "url(/brand/stars.png)",
        WebkitMaskImage: "url(/brand/stars.png)",
        maskSize: m.size,
        WebkitMaskSize: m.size,
        maskRepeat: m.repeat,
        WebkitMaskRepeat: m.repeat,
        maskPosition: m.position,
        WebkitMaskPosition: m.position,
      }}
    />
  );
}
