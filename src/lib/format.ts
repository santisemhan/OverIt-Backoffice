/* Números, porcentajes y fechas en español (Argentina): 2.485 · 47,7% · 12 oct · 21:43 */

const nf = new Intl.NumberFormat("es-AR");
const nf1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const n = (v: number) => nf.format(Math.round(v));
export const n1 = (v: number) => nf1.format(v);
/** 47,7% (sin espacio, como en la app); por debajo de 10, con un decimal */
export const p = (v: number, digits?: number) =>
  `${(digits ?? (Math.abs(v) < 10 && v !== 0 ? 1 : 0)) ? nf1.format(v) : nf.format(Math.round(v))}%`;
export const usd = (v: number) => `USD ${money.format(v)}`;
/** 1,2 mil · 12,9 mil (para ejes) */
export const compact = (v: number) =>
  Math.abs(v) >= 1000 ? `${nf1.format(v / 1000).replace(/,0$/, "")} mil` : nf.format(Math.round(v));

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const dayShort = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MES[d.getMonth()]}`;
};
export const dayLong = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
export const weekday = (t: number) => DIAS[new Date(t).getDay()];
/** "Mar 29 sept" (solo la primera letra en mayúscula) */
export const dayWithWeekday = (t: number) => {
  const s = `${weekday(t)} ${dayShort(t)}`;
  return s[0].toUpperCase() + s.slice(1);
};
export const time = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const dateTime = (t: number) => `${dayShort(t)} · ${time(t)}`;

/** "Ahora", "Hace 5 min", "Hace 3 h", "Ayer", "Hace 4 días", "Hace 2 meses" */
export function ago(t: number, now: number) {
  const d = Math.max(0, now - t);
  const min = 60_000;
  if (d < min) return "Ahora";
  if (d < 60 * min) return `Hace ${Math.floor(d / min)} min`;
  if (d < 24 * 60 * min) return `Hace ${Math.floor(d / (60 * min))} h`;
  const days = Math.floor(d / (24 * 60 * min));
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.round(days / 30.4);
  return months <= 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

/** 3 min 12 s · 45 s */
export function secs(s: number) {
  const v = Math.round(s);
  if (v < 60) return `${v} s`;
  const m = Math.floor(v / 60);
  const r = v % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

export const plural = (k: number, one: string, many: string) => `${n(k)} ${k === 1 ? one : many}`;
