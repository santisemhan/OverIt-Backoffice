"use client";

import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";
import { compact, dayShort, dayWithWeekday, n as fmtN } from "@/lib/format";
import { decodeDots, MAP } from "./mapDots";

/*
 * Gráficos del Back Office (SVG propio, sin librerías). Reglas (skill dataviz):
 *   - líneas de 2 px, barras ≤ 24 px con punta redondeada de 4 px y 2 px de aire entre barras;
 *   - grilla en línea fina y sólida, apagada; el texto siempre en tinta (nunca del color de la serie);
 *   - tooltip al pasar el mouse (o con el dedo) en todos; leyenda siempre con 2 o más series;
 *   - paleta categórica fija y validada: violeta, naranja, celeste (en ese orden, nunca rotada).
 */

export const SERIES = ["#5E5BE2", "#E07040", "#14A3B8"] as const;
/* Rampa secuencial (un solo tono, de claro a oscuro) para magnitudes: mapa y mapa de calor */
export const RAMP = ["#ECEBFC", "#D3D1F8", "#B0AEF2", "#8D8AEC", "#6D6AE5", "#4F4CC9", "#3A37A6"];
const GRID = "#EEEBE5";
const AXIS = "#6B6A6A";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* Ticks "redondos" para el eje Y. Siempre enteros: se cuentan personas, mensajes o porcentajes (nunca "2,5 personas") */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? 10 * mag;
  step = Math.max(1, Math.round(step));
  if (step < raw) step = Math.ceil(raw);
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

/* Tooltip que sigue al cursor sin salirse del gráfico */
function Tooltip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = x > w * 0.62;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[132px] rounded-[12px] bg-ink px-3 py-2.5 text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
      style={{ top: y, left: left ? undefined : x + 14, right: left ? w - x + 14 : undefined }}
    >
      {children}
    </div>
  );
}
export function TipRow({ color, label, value }: { color?: string; label: ReactNode; value: ReactNode }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-4 text-[12.5px] font-medium first:mt-0">
      <span className="flex items-center gap-1.5 text-white/85">
        {color && <span className="h-[8px] w-[8px] rounded-full ring-2 ring-white/20" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-bold text-white tnum">{value}</span>
    </div>
  );
}

/* "Ver tabla": el mismo dato como tabla (accesible y para leer números exactos) */
export function WithTable({
  table,
  children,
  label,
}: {
  table: { cols: string[]; rows: (string | number)[][] };
  children: ReactNode;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        className="absolute -top-1 right-0 z-10 inline-flex h-[28px] press items-center gap-1.5 rounded-[9px] bg-white px-2.5 text-[12.5px] font-bold text-ink-60 hover:bg-ink/5 hover:text-ink"
      >
        <Icon.table size={15} />
        {show ? "Ver gráfico" : "Ver tabla"}
      </button>
      {show ? (
        <div className="mt-8 max-h-[320px] overflow-auto rounded-[12px] shadow-[inset_0_0_0_1px_#EAE7E0]">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-bo-soft">
              <tr>
                {table.cols.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-bold text-ink-70">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-bo-line">
                  {r.map((v, k) => (
                    <td
                      key={k}
                      className={cx("px-3 py-1.5 font-medium", typeof v === "number" ? "text-ink tnum" : "text-ink-70")}
                    >
                      {typeof v === "number" ? fmtN(v) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ═══════════════ Líneas en el tiempo (con cursor) ═══════════════ */

/*
 * Curva monótona (Fritsch–Carlson): suaviza la línea sin inventar picos ni bajar de 0 entre dos días
 * (nunca se pasa de los valores reales), a diferencia de una curva común.
 */
export function smoothPath(pts: [number, number][]) {
  const n = pts.length;
  if (!n) return "";
  if (n < 3) return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) m.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1));
  const t = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const q = a * a + b * b;
    if (q > 9) {
      const k = 3 / Math.sqrt(q);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = (x1 - x0) / 3;
    d += `C${(x0 + h).toFixed(1)} ${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)} ${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

export type Series = { id: string; label: string; color: string; points: { t: number; v: number }[] };

export function TimeChart({
  series: all,
  height = 240,
  area = true,
  yFormat = compact,
  valueFormat = fmtN,
  legend = true,
  xFormat = dayShort,
  tipTitle = dayWithWeekday,
  partialLast = false,
}: {
  series: Series[];
  height?: number;
  area?: boolean;
  yFormat?: (v: number) => string;
  valueFormat?: (v: number) => string;
  legend?: boolean;
  /** Etiquetas del eje X (por defecto, "12 oct") */
  xFormat?: (t: number) => string;
  /** Título del globo (por defecto, "Lun 12 oct"; por semana, "Semana del 7 sept") */
  tipTitle?: (t: number) => string;
  /** El último punto es hoy (todavía no terminó): se dibuja punteado y el globo lo aclara */
  partialLast?: boolean;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  /* La leyenda también es un filtro: tocar una serie la oculta o la muestra (siempre queda al menos una) */
  const [off, setOff] = useState<string[]>([]);
  const series = all.filter((s) => !off.includes(s.id));
  const gid = useId();
  const pts = all[0]?.points ?? [];
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.v)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const padL = 40;
  const padR = 14;
  const padT = 10;
  const padB = 26;
  const iw = Math.max(1, w - padL - padR);
  const ih = height - padT - padB;
  const x = (i: number) => padL + (pts.length <= 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / top) * ih;
  const cut = partialLast && pts.length > 2;
  const path = (s: Series) => smoothPath((cut ? s.points.slice(0, -1) : s.points).map((p, i) => [x(i), y(p.v)]));
  const tail = (s: Series) => {
    const n = s.points.length;
    return `M${x(n - 2).toFixed(1)} ${y(s.points[n - 2].v).toFixed(1)}L${x(n - 1).toFixed(1)} ${y(s.points[n - 1].v).toFixed(1)}`;
  };
  const labelEvery = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 74))));
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - padL) / iw) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };
  return (
    <div>
      {legend && all.length > 1 && (
        <div
          className="mb-3 flex flex-wrap gap-1.5 pr-[110px]"
          role="group"
          aria-label="Series del gráfico (tocá para mostrar u ocultar)"
        >
          {all.map((s) => {
            const on = !off.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                data-tip={
                  on ? (series.length > 1 ? "Ocultar esta serie" : "Siempre queda una visible") : "Mostrar esta serie"
                }
                onClick={() =>
                  on ? series.length > 1 && setOff((o) => [...o, s.id]) : setOff((o) => o.filter((x) => x !== s.id))
                }
                className={cx(
                  "inline-flex h-[28px] press items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[12.5px] font-bold transition-colors",
                  on
                    ? "bg-[#F3F1EC] text-ink-70 hover:bg-[#ECE9E2]"
                    : "text-ink-60 shadow-[inset_0_0_0_1px_#E3E0D9] hover:text-ink-70",
                )}
              >
                <span
                  className="h-[3px] w-[14px] rounded-full transition-opacity"
                  style={{ background: s.color, opacity: on ? 1 : 0.3 }}
                />
                <span className={on ? "" : "line-through decoration-ink/30"}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div
        ref={ref}
        className="relative touch-pan-y select-none"
        style={{ height }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {w > 0 && (
          <svg
            width={w}
            height={height}
            className="block overflow-visible"
            role="img"
            aria-label={series.map((s) => s.label).join(", ")}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`${gid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text
                  x={padL - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="tnum"
                  fontSize="11.5"
                  fontWeight={500}
                  fill={AXIS}
                >
                  {yFormat(t)}
                </text>
              </g>
            ))}
            {pts.map((p, i) =>
              i % labelEvery === 0 || i === pts.length - 1 ? (
                i === pts.length - 1 || pts.length - 1 - i >= labelEvery * 0.6 ? (
                  <text
                    key={p.t}
                    x={x(i)}
                    y={height - 6}
                    textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}
                    fontSize="11.5"
                    fontWeight={500}
                    fill={AXIS}
                  >
                    {xFormat(p.t)}
                  </text>
                ) : null
              ) : null,
            )}
            {area && series[0] && pts.length > 1 && (
              <path
                className="fade-in"
                d={`${path(series[0])}L${x(pts.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`}
                fill={`url(#${gid}-${series[0].id})`}
              />
            )}
            {series.map((s) => (
              <path
                key={s.id}
                d={path(s)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="fade-in"
              />
            ))}
            {cut &&
              series.map((s) => (
                <path
                  key={`t${s.id}`}
                  d={tail(s)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  opacity={0.7}
                />
              ))}
            {/* Punto final de cada serie (con anillo del color de fondo) */}
            {hover === null &&
              series.map((s) => {
                const last = s.points[s.points.length - 1];
                return last ? (
                  <circle
                    key={s.id}
                    cx={x(s.points.length - 1)}
                    cy={y(last.v)}
                    r={4}
                    fill={cut ? "#fff" : s.color}
                    stroke={cut ? s.color : "#fff"}
                    strokeWidth={2}
                  />
                ) : null;
              })}
            {hover !== null && (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={padT}
                  y2={padT + ih}
                  stroke="#242323"
                  strokeOpacity={0.18}
                  strokeWidth={1}
                />
                {series.map((s) => (
                  <circle
                    key={s.id}
                    cx={x(hover)}
                    cy={y(s.points[hover]?.v ?? 0)}
                    r={4.5}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
        )}
        {hover !== null && pts[hover] && (
          <Tooltip x={x(hover)} y={8} w={w}>
            <p className="mb-1.5 text-[12px] font-bold text-white/70">
              {tipTitle(pts[hover].t)}
              {cut && hover === pts.length - 1 ? " · hoy, en curso" : ""}
            </p>
            {series.map((s) => (
              <TipRow
                key={s.id}
                color={series.length > 1 ? s.color : undefined}
                label={s.label}
                value={valueFormat(s.points[hover]?.v ?? 0)}
              />
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Columnas (una por día o categoría; se pueden tocar) ═══════════════ */

export type Col = { key: string; label: string; v: number; tip?: ReactNode; color?: string };

export function Columns({
  data,
  height = 220,
  color = SERIES[0],
  selected,
  onSelect,
  yFormat = compact,
  valueLabel = "",
  labelEvery: forceEvery,
  ariaLabel,
  values,
  axis = true,
  barMax = 24,
}: {
  data: Col[];
  height?: number;
  color?: string;
  selected?: string | null;
  onSelect?: (key: string) => void;
  yFormat?: (v: number) => string;
  valueLabel?: string;
  labelEvery?: number;
  ariaLabel: string;
  /** Valor escrito arriba de cada barra (solo si entra) */
  values?: (d: Col) => string;
  /** Sin eje Y ni grilla (cuando cada barra ya tiene su valor) */
  axis?: boolean;
  /** Ancho máximo de la barra (las categorías pueden ir más anchas que los días) */
  barMax?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.v));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const padL = axis ? 36 : 2;
  const padR = axis ? 6 : 2;
  const padT = values ? 24 : 10;
  const padB = 26;
  const iw = Math.max(1, w - padL - padR);
  const ih = height - padT - padB;
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(2, Math.min(barMax, slot - (barMax > 24 ? 10 : 2)));
  const y = (v: number) => padT + ih - (v / top) * ih;
  const every = forceEvery ?? Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 56))));
  const r = Math.min(4, bw / 2);
  const bar = (i: number, v: number) => {
    const x0 = padL + i * slot + (slot - bw) / 2;
    const y0 = y(v);
    const h = padT + ih - y0;
    if (h <= 0.5) return "";
    const rr = Math.min(r, h);
    return `M${x0} ${padT + ih}V${y0 + rr}Q${x0} ${y0} ${x0 + rr} ${y0}H${x0 + bw - rr}Q${x0 + bw} ${y0} ${x0 + bw} ${y0 + rr}V${padT + ih}Z`;
  };
  const indexAt = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - padL) / slot);
    return i >= 0 && i < data.length ? i : null;
  };
  return (
    <div
      ref={ref}
      className={cx("relative touch-pan-y select-none", onSelect && "cursor-pointer")}
      style={{ height }}
      onPointerMove={(e) => setHover(indexAt(e))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        const i = indexAt(e as unknown as React.PointerEvent);
        if (i !== null && onSelect && data[i].v > 0) onSelect(data[i].key);
      }}
    >
      {w > 0 && (
        <svg width={w} height={height} className="block overflow-visible" role="img" aria-label={ariaLabel}>
          {axis ? (
            ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text
                  x={padL - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="tnum"
                  fontSize="11.5"
                  fontWeight={500}
                  fill={AXIS}
                >
                  {yFormat(t)}
                </text>
              </g>
            ))
          ) : (
            <line x1={padL} x2={w - padR} y1={padT + ih} y2={padT + ih} stroke="#DDD9D1" strokeWidth={1} />
          )}
          {hover !== null && (
            <rect x={padL + hover * slot} y={padT} width={slot} height={ih} fill="#242323" fillOpacity={0.04} rx={4} />
          )}
          {/* El día elegido: su columna en lila suave (antes un contorno negro, muy pesado) */}
          {selected != null &&
            data.map((d, i) =>
              d.key === selected ? (
                <rect
                  key="sel"
                  x={padL + i * slot - Math.max(0, (8 - slot) / 2)}
                  y={padT}
                  width={Math.max(slot, 8)}
                  height={ih}
                  rx={4}
                  fill="#5E5BE2"
                  fillOpacity={0.14}
                />
              ) : null,
            )}
          <g>
            {data.map((d, i) => {
              const sel = selected === d.key;
              const dim = selected != null && !sel;
              return (
                <path
                  key={d.key}
                  d={bar(i, d.v)}
                  fill={d.color ?? color}
                  fillOpacity={dim ? 0.35 : 1}
                  className="grow-y"
                  style={{ animationDelay: `${Math.min(i * 6, 300)}ms` }}
                />
              );
            })}
          </g>
          {values &&
            slot >= 26 &&
            data.map((d, i) => (
              <text
                key={`v${d.key}`}
                x={padL + i * slot + slot / 2}
                y={y(d.v) - 7}
                textAnchor="middle"
                className="fade-in tnum"
                fontSize="12"
                fontWeight={800}
                fill="#242323"
              >
                {values(d)}
              </text>
            ))}
          {data.map((d, i) =>
            i % every === 0 ? (
              <text
                key={d.key}
                x={padL + i * slot + slot / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight={axis ? 500 : 700}
                fill={AXIS}
              >
                {d.label}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={padL + hover * slot + slot / 2} y={8} w={w}>
          {data[hover].tip ?? (
            <>
              <p className="mb-1 text-[12px] font-bold text-white/70">{data[hover].label}</p>
              <TipRow label={valueLabel} value={fmtN(data[hover].v)} />
            </>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ═══════════════ Barras espejadas: lo que entra arriba, lo que sale abajo (altas y cancelaciones) ═══════════════ */

export function MirrorColumns({
  up,
  down,
  upLabel,
  downLabel,
  height = 230,
  ariaLabel,
}: {
  up: { t: number; v: number }[];
  down: { t: number; v: number }[];
  upLabel: string;
  downLabel: string;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...up.map((p) => p.v), ...down.map((p) => p.v));
  const ticks = niceTicks(max, 2);
  const top = ticks[ticks.length - 1];
  const padL = 30;
  const padR = 6;
  const padT = 8;
  const padB = 24;
  const iw = Math.max(1, w - padL - padR);
  const half = (height - padT - padB) / 2;
  const mid = padT + half;
  const slot = iw / Math.max(1, up.length);
  const bw = Math.max(2, Math.min(18, slot - 2));
  const r = Math.min(4, bw / 2);
  const every = Math.max(1, Math.ceil(up.length / Math.max(2, Math.floor(iw / 64))));
  const bar = (i: number, v: number, dir: 1 | -1) => {
    const hgt = (v / top) * half;
    if (hgt < 0.5) return "";
    const x0 = padL + i * slot + (slot - bw) / 2;
    const rr = Math.min(r, hgt);
    const yEnd = mid - dir * hgt;
    /* Punta redondeada lejos de la línea del medio, recta contra ella (con 1 px de aire) */
    const y0 = mid - dir * 1;
    return dir === 1
      ? `M${x0} ${y0}V${yEnd + rr}Q${x0} ${yEnd} ${x0 + rr} ${yEnd}H${x0 + bw - rr}Q${x0 + bw} ${yEnd} ${x0 + bw} ${yEnd + rr}V${y0}Z`
      : `M${x0} ${y0}V${yEnd - rr}Q${x0} ${yEnd} ${x0 + rr} ${yEnd}H${x0 + bw - rr}Q${x0 + bw} ${yEnd} ${x0 + bw} ${yEnd - rr}V${y0}Z`;
  };
  const idx = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - padL) / slot);
    return i >= 0 && i < up.length ? i : null;
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 pr-[110px]">
        <Key color={SERIES[0]} label={`${upLabel} (arriba)`} />
        <Key color={SERIES[1]} label={`${downLabel} (abajo)`} />
      </div>
      <div
        ref={ref}
        className="relative touch-pan-y select-none"
        style={{ height }}
        onPointerMove={(e) => setHover(idx(e))}
        onPointerLeave={() => setHover(null)}
      >
        {w > 0 && (
          <svg width={w} height={height} className="block overflow-visible" role="img" aria-label={ariaLabel}>
            {ticks.slice(1).map((t) => (
              <g key={t}>
                {[1, -1].map((dir) => (
                  <g key={dir}>
                    <line
                      x1={padL}
                      x2={w - padR}
                      y1={mid - (dir * t * half) / top}
                      y2={mid - (dir * t * half) / top}
                      stroke={GRID}
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={mid - (dir * t * half) / top}
                      dy="0.32em"
                      textAnchor="end"
                      className="tnum"
                      fontSize="11.5"
                      fontWeight={500}
                      fill={AXIS}
                    >
                      {fmtN(t)}
                    </text>
                  </g>
                ))}
              </g>
            ))}
            {hover !== null && (
              <rect
                x={padL + hover * slot}
                y={padT}
                width={slot}
                height={half * 2}
                fill="#242323"
                fillOpacity={0.04}
                rx={4}
              />
            )}
            {up.map((p, i) => (
              <path key={`u${p.t}`} d={bar(i, p.v, 1)} fill={SERIES[0]} className="fade-in" />
            ))}
            {down.map((p, i) => (
              <path key={`d${p.t}`} d={bar(i, p.v, -1)} fill={SERIES[1]} className="fade-in" />
            ))}
            <line x1={padL} x2={w - padR} y1={mid} y2={mid} stroke="#CFCBC2" strokeWidth={1} />
            <text x={padL - 8} y={mid} dy="0.32em" textAnchor="end" fontSize="11.5" fontWeight={500} fill={AXIS}>
              0
            </text>
            {up.map((p, i) =>
              i % every === 0 ? (
                <text
                  key={`l${p.t}`}
                  x={padL + i * slot + slot / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight={500}
                  fill={AXIS}
                >
                  {dayShort(p.t)}
                </text>
              ) : null,
            )}
          </svg>
        )}
        {hover !== null && up[hover] && (
          <Tooltip x={padL + hover * slot + slot / 2} y={8} w={w}>
            <p className="mb-1.5 text-[12px] font-bold text-white/70">{dayWithWeekday(up[hover].t)}</p>
            <TipRow color={SERIES[0]} label={upLabel} value={fmtN(up[hover].v)} />
            <TipRow color={SERIES[1]} label={downLabel} value={fmtN(down[hover]?.v ?? 0)} />
            <TipRow
              label="Neto"
              value={`${up[hover].v - (down[hover]?.v ?? 0) > 0 ? "+" : ""}${fmtN(up[hover].v - (down[hover]?.v ?? 0))}`}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Barras horizontales (respuestas, rankings) ═══════════════ */

export type BarRow = { key: string; label: ReactNode; value: number; pct: number; hint?: ReactNode; color?: string };

export function BarList({
  rows,
  color = SERIES[0],
  format = (r: BarRow) =>
    `${fmtN(r.value)} · ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(r.pct)}%`,
  onPick,
  active,
  track = "#F1EFEA",
}: {
  rows: BarRow[];
  color?: string;
  format?: (r: BarRow) => ReactNode;
  onPick?: (key: string) => void;
  active?: string | null;
  track?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.pct));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const Tag = onPick ? "button" : "div";
        return (
          <li key={r.key}>
            <Tag
              {...(onPick
                ? { type: "button" as const, onClick: () => onPick(r.key), "aria-pressed": active === r.key }
                : {})}
              className={cx(
                "block w-full text-left",
                onPick && "-mx-2 press rounded-[10px] px-2 py-1 hover:bg-bo-soft",
                onPick && active === r.key && "bg-purple-10",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[13.5px] leading-[1.35] font-bold text-ink">{r.label}</span>
                <span className="shrink-0 text-[12.5px] font-bold text-ink-70 tnum">{format(r)}</span>
              </div>
              <div className="mt-1.5 h-[8px] overflow-hidden rounded-full" style={{ background: track }}>
                <div
                  className="h-full grow-x rounded-full"
                  style={{
                    width: `${(r.pct / max) * 100}%`,
                    background: r.color ?? color,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              </div>
              {r.hint && <p className="mt-1 text-[12px] font-medium text-ink-60">{r.hint}</p>}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════════ Una barra al 100 % (partes de un todo: idioma, plan, origen del reinicio) ═══════════════ */

export function Stack100({
  parts,
  height = 14,
  showLegend = true,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
  height?: number;
  showLegend?: boolean;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }}>
        {parts.map((p) =>
          p.value > 0 ? (
            <div
              key={p.key}
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
              data-tip={`${p.label}: ${fmtN(p.value)} (${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format((p.value / total) * 100)}%)`}
              className="h-full transition-opacity duration-150 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(p.value / total) * 100}%`,
                background: p.color,
                opacity: hover && hover !== p.key ? 0.4 : 1,
              }}
            />
          ) : null,
        )}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {parts.map((p) => (
            <li
              key={p.key}
              className="flex items-center gap-2 text-[13px]"
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="h-[10px] w-[10px] rounded-full" style={{ background: p.color }} />
              <span className="font-bold text-ink">{p.label}</span>
              <span className="font-medium text-ink-60 tnum">
                {fmtN(p.value)} ·{" "}
                {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format((p.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════ Mapa de calor (día de la semana × hora) ═══════════════ */

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export function Heatmap({ grid, valueLabel }: { grid: number[][]; valueLabel: string }) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const max = Math.max(1, ...grid.flat());
  const color = (v: number) =>
    v <= 0 ? "#F3F1EC" : RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 0.01)))];
  return (
    <div className="relative">
      {/* Una sola grilla: la etiqueta de cada día va en la misma fila que sus 24 horas (siempre alineadas) */}
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "30px repeat(24, minmax(0, 1fr))" }}
        onPointerLeave={() => setHover(null)}
      >
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={`h${h}`} className="text-center text-[10.5px] leading-[15px] font-bold text-ink-60">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
        {grid.map((row, d) => (
          <Fragment key={d}>
            <span className="flex items-center text-[11.5px] font-bold text-ink-60">{WEEK[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                onPointerEnter={() => setHover([d, h])}
                className={cx(
                  "aspect-square min-h-[9px] rounded-[3px] transition-shadow",
                  hover?.[0] === d && hover?.[1] === h && "shadow-[0_0_0_2px_#242323]",
                )}
                style={{ background: color(v) }}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-60">
          Menos
          {RAMP.map((c) => (
            <span key={c} className="h-[10px] w-[14px] rounded-[3px]" style={{ background: c }} />
          ))}
          Más
        </div>
        <p className="text-[12.5px] font-bold text-ink-70 tnum" aria-live="polite">
          {hover
            ? `${WEEK[hover[0]]} ${String(hover[1]).padStart(2, "0")}:00 · ${fmtN(grid[hover[0]][hover[1]])} ${valueLabel}`
            : " "}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ Mapa de puntos (países) ═══════════════ */

let dotsCache: ReturnType<typeof decodeDots> | null = null;
export function DotMap({
  values,
  names,
  selected,
  onSelect,
  scale = "sqrt",
  tip,
}: {
  values: Record<string, number>;
  names: Record<string, string>;
  selected?: string | null;
  onSelect?: (num: string | null) => void;
  /** sqrt: cantidades (los países chicos se ven); linear: porcentajes */
  scale?: "sqrt" | "linear";
  /** Lo que dice el globo al pasar por un país (por defecto, "N usuarios") */
  tip?: (id: string) => ReactNode;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const dots = useMemo(() => (dotsCache ??= decodeDots()), []);
  const vals = Object.values(values).filter((v) => v > 0);
  const max = Math.max(1, ...vals);
  const min = scale === "linear" && vals.length ? Math.min(...vals) : 0;
  const pitch = w / MAP.cols;
  const h = pitch * MAP.rows;
  const rad = Math.max(1.1, pitch * 0.36);
  /* Escala por raíz (para que los países chicos se vean) en la rampa secuencial */
  const color = (id: string) => {
    const v = values[id] ?? 0;
    if (!v) return "#E4E0D8";
    const k = scale === "linear" ? (max > min ? (v - min) / (max - min) : 1) : Math.sqrt(v / max);
    return RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(k * (RAMP.length - 1.01)))];
  };
  const groups = useMemo(() => {
    const g = new Map<string, { c: number; r: number }[]>();
    for (const d of dots) {
      const k = d.id;
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(d);
    }
    return [...g.entries()];
  }, [dots]);
  const focus = hover ?? selected ?? null;
  const center = useMemo(() => {
    if (!hover) return null;
    const list = groups.find(([k]) => k === hover)?.[1];
    if (!list?.length) return null;
    return {
      x: (list.reduce((a, d) => a + d.c, 0) / list.length + 0.5) * pitch,
      y: (Math.min(...list.map((d) => d.r)) + 0.5) * pitch,
    };
  }, [hover, groups, pitch]);
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: h || 1 }}>
      {w > 0 && (
        <svg width={w} height={h} className="block" role="img" aria-label="Mapa de usuarios por país">
          {groups.map(([id, list]) => {
            const has = (values[id] ?? 0) > 0;
            const dim = focus && focus !== id;
            const d = list
              .map(
                (p) =>
                  `M${(p.c + 0.5) * pitch - rad} ${(p.r + 0.5) * pitch}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0`,
              )
              .join("");
            return (
              <g
                key={id}
                className={cx(has && onSelect && "cursor-pointer")}
                onPointerEnter={() => has && setHover(id)}
                onPointerLeave={() => setHover(null)}
                onClick={() => has && onSelect?.(selected === id ? null : id)}
              >
                {has && (
                  <path
                    d={list.map((p) => `M${p.c * pitch} ${p.r * pitch}h${pitch}v${pitch}h${-pitch}z`).join("")}
                    fill="transparent"
                  />
                )}
                <path
                  d={d}
                  fill={color(id)}
                  fillOpacity={dim && has ? 0.4 : 1}
                  className="transition-[fill-opacity] duration-150"
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover && center && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-[10px] bg-ink px-2.5 py-1.5 text-white shadow-[0_8px_22px_rgba(0,0,0,0.2)]"
          style={{ left: Math.max(60, Math.min(w - 60, center.x)), top: center.y }}
        >
          <p className="text-[12.5px] font-bold whitespace-nowrap">{names[hover] ?? "—"}</p>
          {tip ? (
            tip(hover)
          ) : (
            <p className="text-[12px] font-medium whitespace-nowrap text-white/80 tnum">
              {fmtN(values[hover] ?? 0)} usuarios
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* La rampa del mapa: de menos a más */
export function RampLegend({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-60">
      <span className="tnum">{from}</span>
      {RAMP.slice(1).map((c) => (
        <span key={c} className="h-[9px] w-[16px] rounded-[3px]" style={{ background: c }} />
      ))}
      <span className="tnum">{to}</span>
    </div>
  );
}

/*
 * Waffle: 100 cuadraditos, uno por cada 1 % (partes de un todo que se cuentan con la vista).
 * Pasar el mouse por una parte (o por su leyenda) la resalta.
 */
export function Waffle({
  parts,
  cols = 10,
}: {
  parts: { key: string; label: string; value: number; color: string; hint?: string }[];
  cols?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((a, p) => a + p.value, 0);
  /* Reparto de los 100 cuadrados por el método del resto mayor (siempre suman 100) */
  const cells = useMemo(() => {
    if (!total) return [] as string[];
    const exact = parts.map((p) => (p.value / total) * 100);
    const base = exact.map(Math.floor);
    let left = 100 - base.reduce((a, b) => a + b, 0);
    const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
    for (const o of order) {
      if (left <= 0) break;
      base[o.i]++;
      left--;
    }
    return parts.flatMap((p, i) => Array.from({ length: base[i] }, () => p.key));
  }, [parts, total]);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
      <div
        className="grid w-[136px] shrink-0 gap-[2.5px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={parts.map((p) => `${p.label}: ${total ? Math.round((p.value / total) * 100) : 0}%`).join(", ")}
      >
        {cells.map((k, i) => {
          const part = parts.find((p) => p.key === k)!;
          return (
            <span
              key={i}
              onPointerEnter={() => setHover(k)}
              className="aspect-square rounded-[3px] transition-opacity duration-150"
              style={{ background: part.color, opacity: hover && hover !== k ? 0.25 : 1 }}
            />
          );
        })}
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {parts.map((p) => (
          <li
            key={p.key}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            className={cx("-mx-2 rounded-[10px] px-2 py-1 transition-colors", hover === p.key && "bg-bo-soft")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: p.color }} />
                {p.label}
              </span>
              <span className="text-[15px] font-black text-ink tnum">
                {total
                  ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format((p.value / total) * 100)
                  : 0}
                %
              </span>
            </div>
            {p.hint && <p className="mt-0.5 pl-[18px] text-[12px] font-medium text-ink-60">{p.hint}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Anillo de porcentaje chico (para una sola cifra; no reemplaza contenido) */
export function Ring({
  value,
  size = 44,
  color = SERIES[0],
  track = "#EFEEFC",
  stroke = 5,
}: {
  value: number;
  size?: number;
  color?: string;
  track?: string;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.max(0, Math.min(100, value)) / 100)}
        style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.23,1,0.32,1)" }}
      />
    </svg>
  );
}

/* Clave de leyenda: el color va en la marca, el texto en tinta */
export function Key({ color, label, shape = "dot" }: { color: string; label: ReactNode; shape?: "dot" | "line" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-70">
      {shape === "dot" ? (
        <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
      ) : (
        <span className="h-[3px] w-[14px] rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
