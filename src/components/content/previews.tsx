"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui/icons";
import {
  BREATH_ACTIONS,
  BREATHING_TYPES,
  categoryOf,
  PATH_DAYS,
  type BreathStep,
  type BreathingType,
  type ChallengeType,
  type ResourceCategory,
  type ResourceType,
  type TextPart,
} from "@/lib/content/types";
import type { Block } from "./body";
import { PartsText } from "./shared";

/* ═══════════════ Previews, as the app shows each piece ═══════════════ */

const card = "rounded-[20px] bg-white shadow-[0_1px_2px_rgba(36,35,35,0.06),0_8px_24px_rgba(36,35,35,0.08)]";

/** "**negrita**" inside a line. */
function inline(text: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<b key={m.index}>{m[1]}</b>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* The challenge as the home card ("Reto del día | Día N/90"; fixed copy from the app). */
export function ChallengePreview({
  title,
  action,
  type,
  labels,
  day,
}: {
  title: string;
  action: string;
  type: ChallengeType;
  labels: string[];
  day?: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-purple-10 px-[18px] pt-5 pb-5 shadow-[inset_0_0_0_1px_#DFDEF9]">
      <span
        aria-hidden
        className="absolute -top-[70px] -right-[70px] h-[150px] w-[150px] rounded-full bg-purple-20/80"
      />
      <span
        aria-hidden
        className="absolute top-[80px] -right-[70px] h-[150px] w-[150px] rounded-full bg-purple-20/45"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="text-[17px] leading-tight font-bold tracking-[-0.01em] whitespace-nowrap text-ink">
          Reto del día <span className="mx-0.5 font-medium text-ink-40">|</span>{" "}
          <span className="font-medium">{day && day <= PATH_DAYS ? `Día ${day}/${PATH_DAYS}` : "Sin día"}</span>
        </p>
        <span className="flex h-[28px] shrink-0 items-center gap-1 rounded-full bg-white pr-2.5 pl-2 text-[12.5px] font-medium text-ink-70">
          <Icon.clock size={14} />
          Pendiente
        </span>
      </div>
      <p className="relative mt-3 flex items-center gap-2 text-[14px] leading-snug font-medium text-ink">
        <Icon.flame size={20} className="shrink-0 text-[#E07040]" />
        Completa el reto para no perder progreso.
      </p>
      <p className="relative mt-4 text-[16px] font-bold text-ink">{title || "Título del reto"}</p>
      <p className="relative mt-2 text-[14px] leading-[1.5] font-medium whitespace-pre-line text-ink-70">
        {action || "La consigna aparece acá."}
      </p>
      {type === "InApp" ? (
        <>
          <div className="relative mt-4 flex gap-1.5" aria-hidden>
            {labels.map((_, i) => (
              <span key={i} className="h-[4px] flex-1 rounded-full bg-purple-20" />
            ))}
          </div>
          <ol className="relative mt-3 overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(36,35,35,0.04),0_6px_16px_rgba(94,91,226,0.08)]">
            {labels.map((f, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-[#F0EFF8] px-3.5 py-3 last:border-b-0">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-purple-10 text-[11.5px] font-bold text-purple">
                  {i + 1}
                </span>
                <span className="truncate text-[14px] font-medium text-ink-40">{f || "Texto de ayuda..."}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="relative mt-4 rounded-[14px] bg-white/70 px-3.5 py-2.5 text-[13px] font-medium text-ink-70">
          Se hace fuera de la app: la persona solo lo marca como hecho.
        </p>
      )}
      <div className="relative mt-4 flex h-[46px] items-center justify-center rounded-full bg-purple text-[15px] font-bold text-white opacity-40">
        {type === "InApp" ? "Guardar" : "Listo"}
      </div>
    </div>
  );
}

/* Shape of the rhythm: 2 steps circle, 3 triangle, 4+ square (as in the app). */
export function rhythmPath(n: number, S: number) {
  const m = 6;
  if (n <= 2) {
    const r = S / 2 - m;
    const c = S / 2;
    return `M${c} ${c + r}A${r} ${r} 0 0 1 ${c} ${c - r}A${r} ${r} 0 0 1 ${c} ${c + r}Z`;
  }
  if (n >= 4) return `M${m} ${S - m}L${m} ${m}L${S - m} ${m}L${S - m} ${S - m}Z`;
  const side = S - 2 * m;
  const h = (side * Math.sqrt(3)) / 2;
  const top = (S - h) / 2;
  return `M${m} ${top + h}L${S / 2} ${top}L${S - m} ${top + h}Z`;
}

export const actionLabel = (a: BreathStep["action"]) => BREATH_ACTIONS.find((x) => x.id === a)?.label ?? a;
export const breathingTypeLabel = (t: BreathingType) => BREATHING_TYPES.find((x) => x.id === t)?.label ?? t;

/* A light runs along each side for the length of its step. */
export function BreathPreview({
  title,
  description,
  type,
  cicle,
}: {
  title: string;
  description: string;
  type: BreathingType;
  cicle: BreathStep[];
}) {
  const reduce = useReducedMotion();
  const S = 180;
  const steps = cicle.filter((s) => s.durationInSeconds > 0);
  const n = Math.min(4, Math.max(2, steps.length));
  const d = rhythmPath(n, S);
  const T = steps.reduce((a, s) => a + s.durationInSeconds, 0) || 1;
  let acc = 0;
  const keyTimes = [0, ...steps.map((s) => (acc += s.durationInSeconds) / T)]
    .map((x) => Math.min(1, x).toFixed(4))
    .join(";");
  const keyPoints = [0, ...steps.map((_, i) => (i + 1) / steps.length)].map((x) => x.toFixed(4)).join(";");
  const animate = steps.length >= 2 && steps.length <= 4 && !reduce;
  return (
    <div className="rounded-[20px] bg-mint p-5">
      <p className="text-[16px] font-black text-ink">{title || "Título"}</p>
      <p className="mt-1 text-[13px] leading-[1.45] font-medium text-[#3E5A38]">
        {description || "La descripción aparece acá."}
      </p>
      <div className="mt-4 flex justify-center">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-label="Forma del ritmo">
          <path d={d} fill="#CFEBC4" stroke="#3E7C35" strokeWidth={4} strokeLinejoin="round" />
          {animate && (
            <circle r={8} fill="#5E5BE2" stroke="#fff" strokeWidth={3}>
              <animateMotion
                key={`${keyTimes}-${n}`}
                dur={`${T}s`}
                repeatCount="indefinite"
                path={d}
                keyTimes={keyTimes}
                keyPoints={keyPoints}
                calcMode="linear"
              />
            </circle>
          )}
        </svg>
      </div>
      <p className="mt-3 text-center text-[13px] font-bold text-[#2F5A28]">
        {steps.map((s) => `${actionLabel(s.action)} ${s.durationInSeconds}`).join(" · ") || "Sin pasos"}
      </p>
      <p className="mt-1 text-center text-[12px] font-medium text-[#3E5A38]">{`Un ciclo: ${T} s · ${breathingTypeLabel(type)}`}</p>
    </div>
  );
}

export function ResourcePreview({
  titleParts,
  description,
  category,
  type,
  blocks,
  minutes,
}: {
  titleParts: TextPart[];
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  blocks: Block[];
  minutes: number;
}) {
  const cat = categoryOf(category);
  const hasTitle = titleParts.some((p) => p.text.trim());
  return (
    <div className={`overflow-hidden ${card}`}>
      <div className="flex h-[92px] items-end p-4" style={{ background: cat.bg }}>
        <span
          className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-black tracking-[0.04em] uppercase"
          style={{ color: cat.ink }}
        >
          {type === "Tip" ? "Tip" : "Artículo"} · {cat.label}
        </span>
      </div>
      <div className="p-4">
        <p className="text-[19px] leading-[1.2] font-black tracking-[-0.02em] text-ink">
          {hasTitle ? <PartsText parts={titleParts} highlight="rounded-[4px] bg-lime px-1" /> : "Título del artículo"}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-[1.45] font-medium text-ink-70">
          {description || "El resumen de la tarjeta."}
        </p>
        <p className="mt-2 text-[12px] font-bold text-ink-60">{`${minutes} min`}</p>
        <div className="mt-4 max-h-[300px] space-y-2.5 overflow-y-auto border-t border-bo-line pt-4 text-[13.5px] leading-[1.55] text-ink">
          {blocks.map((b, k) =>
            b.t === "h2" ? (
              <p key={k} className="text-[15px] font-black">
                {b.text}
              </p>
            ) : b.t === "li" ? (
              <p key={k} className="flex gap-2">
                <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-purple" />
                <span>
                  {b.lead && <b>{b.lead} </b>}
                  {inline(b.text)}
                </span>
              </p>
            ) : b.t === "quote" ? (
              <p key={k} className="rounded-[12px] bg-purple-10 px-3 py-2 font-bold whitespace-pre-line text-purple">
                {b.text}
              </p>
            ) : (
              <p key={k} className="font-medium whitespace-pre-line text-ink-70">
                {inline(b.text)}
              </p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function PhrasePreview({ parts, author }: { parts: TextPart[]; author: string | null }) {
  const has = parts.some((p) => p.text.trim());
  return (
    <div className="relative flex aspect-[4/5] flex-col justify-center overflow-hidden rounded-[22px] bg-purple p-6 shadow-[0_10px_30px_rgba(94,91,226,0.3)]">
      <svg className="absolute -top-8 -right-8" width="150" height="150" viewBox="0 0 100 100" aria-hidden>
        {[0, 1].map((x) =>
          [0, 1].map((y) => (
            <circle key={`${x}${y}`} cx={50 + (x ? 18 : -18)} cy={50 + (y ? 18 : -18)} r={18} fill="#6A67E6" />
          )),
        )}
      </svg>
      <p className="relative text-[24px] leading-[1.18] font-black tracking-[-0.02em] text-white">
        {has ? <PartsText parts={parts} /> : "La frase aparece acá"}
      </p>
      {author?.trim() && <p className="relative mt-4 text-[13px] font-bold text-white/75">{`— ${author.trim()}`}</p>}
    </div>
  );
}

export function FactPreview({ text }: { text: string }) {
  return (
    <div className={`p-5 ${card}`}>
      <p className="text-[15px] font-black text-ink">Dato científico del día</p>
      <div className="mt-3 flex gap-3">
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-purple-10 text-purple">
          <Icon.brain size={22} />
        </span>
        <p className="text-[14.5px] leading-[1.45] font-bold text-ink">{`“${text || "El dato aparece acá."}”`}</p>
      </div>
    </div>
  );
}
