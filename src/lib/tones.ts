/* Colores por tema del Back Office (ver brand.tsx). Archivo sin dependencias para que lo usen kit y brand */

export type ToneId = "violet" | "lime" | "mint" | "peach" | "lilac" | "sky" | "rose" | "sand";
export const TONE: Record<ToneId, { bg: string; deep: string; ink: string; sub: string; chip: string }> = {
  violet: { bg: "#5E5BE2", deep: "#6B68E8", ink: "#FFFFFF", sub: "#F1F1FD", chip: "rgba(255,255,255,0.18)" },
  lime: { bg: "#E9FF70", deep: "#DCF65A", ink: "#242323", sub: "#4F5A12", chip: "rgba(36,35,35,0.08)" },
  mint: { bg: "#DFF2D8", deep: "#CDEAC2", ink: "#1F4A1A", sub: "#2F6B28", chip: "rgba(31,74,26,0.08)" },
  peach: { bg: "#FEE9E0", deep: "#FCD9C9", ink: "#6E2A0C", sub: "#A8461C", chip: "rgba(110,42,12,0.08)" },
  lilac: { bg: "#EFEEFC", deep: "#E1E0FA", ink: "#2E2B8F", sub: "#4B48C9", chip: "rgba(46,43,143,0.08)" },
  sky: { bg: "#E3F2FB", deep: "#CFE8F7", ink: "#17496B", sub: "#22628F", chip: "rgba(23,73,107,0.08)" },
  rose: { bg: "#FDE3E3", deep: "#FBD0D0", ink: "#7E1F1F", sub: "#B42F2F", chip: "rgba(126,31,31,0.08)" },
  sand: { bg: "#F1EFEA", deep: "#E7E4DD", ink: "#242323", sub: "#6B6A6A", chip: "rgba(36,35,35,0.06)" },
};
