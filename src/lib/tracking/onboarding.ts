import type { OnboardingFunnel } from "./types";

/*
 * The onboarding screens in the app's order (same ids as OverIt-Mobile src/onboarding/flow.ts and
 * public/screens/<id>.webp). `skip`: the screen has a "Saltar" button. Screens up to "plan" (where people sign up) happen before sign-up.
 */

export interface OnboardingStep {
  id: string;
  label: string;
  title: string;
  skip?: boolean;
  /** The onboarding answer key this screen asks (see QUESTION_LABEL). */
  question?: string;
}

export const STEPS: OnboardingStep[] = [
  { id: "opening", label: "Splash + Bienvenida", title: "La tuya sigue." },
  { id: "hurts", label: "Sabemos que duele", title: "Sabemos que duele pero elegiste sanar" },
  { id: "world", label: "Tu dolor no es único", title: "Tu dolor no es único, pero tu proceso sí" },
  {
    id: "q-breakup-time",
    label: "Quiz 1 · Tiempo desde la ruptura",
    title: "¿Cuánto tiempo pasó desde la ruptura?",
    skip: true,
    question: "HOW_TIME_SINCE",
  },
  {
    id: "q-length",
    label: "Quiz 2 · Duración de la relación",
    title: "¿Cuánto tiempo duró la relación?",
    skip: true,
    question: "HOW_TIME_RELATIONSHIP_LAST",
  },
  { id: "body", label: "Tu cuerpo lo siente", title: "Tu cuerpo también lo siente" },
  {
    id: "q-who",
    label: "Quiz 3 · Quién terminó",
    title: "¿Quién tomó la decisión de terminar la relación?",
    skip: true,
    question: "WHO_MADE_THE_DECISION",
  },
  {
    id: "q-causes",
    label: "Quiz 4 · Causas",
    title: "¿Qué fue lo que más influyó en la separación?",
    skip: true,
    question: "WHAT_MOST_INFLUENCED",
  },
  { id: "step", label: "Un paso a la vez", title: "Un paso a la vez, con compañia" },
  {
    id: "q-emotions",
    label: "Quiz 5 · Emociones",
    title: "¿Qué emociones te acompañan más?",
    skip: true,
    question: "YOUR_EMOTIONS_NOW",
  },
  {
    id: "q-habits",
    label: "Quiz 6 · Hábitos",
    title: "¿Qué acciones sientes que repites a diario?",
    skip: true,
    question: "YOUR_ACTIONS_NOW",
  },
  { id: "self-love", label: "Amor propio", title: "Dejar de mirar atrás también es amor propio" },
  { id: "about", label: "Quiz 7 · Datos personales", title: "Queremos conocerte" },
  { id: "future", label: "Quiz 8 · Mensaje al futuro", title: "Un mensaje para tu “yo” del futuro", skip: true },
  { id: "goals", label: "Quiz 9 · Objetivos", title: "Elige tus objetivos", question: "YOUR_GOALS" },
  { id: "plan", label: "Plan + registro", title: "Tu plan está casi listo" },
  { id: "referral", label: "Código de referido", title: "¿Tienes un código de referido?", skip: true },
  { id: "chart", label: "Gráfico de recuperación", title: "Recupérate más rápido, de forma real y saludable" },
  { id: "notifications", label: "Notificaciones", title: "Un pequeño recordatorio puede cambiar tu día" },
  { id: "hold", label: "Contacto Cero (huella)", title: "Tu primer compromiso: El Contacto Cero" },
  { id: "paywall", label: "Paywall", title: "Tu camino está listo" },
];

export const SIGN_UP = STEPS.findIndex((s) => s.id === "referral");
export const PAYWALL = STEPS.length - 1;
export const shot = (id: string) => `/screens/${id}.webp`;

export interface FunnelRow {
  step: OnboardingStep;
  i: number;
  reached: number;
  left: number;
  leftWithAccount: number;
  skipped: number;
  medianSeconds: number | null;
  /** % of the installs that reached it. */
  kept: number;
  /** % of the ones that reached it that left there. */
  exitRate: number;
}

/** One row per screen in the app's order (zeros where the server has no data); `worst` leaves out the paywall. */
export function funnelRows(d: OnboardingFunnel) {
  const rows: FunnelRow[] = STEPS.map((step, i) => {
    const s = d.screens.find((x) => x.screen === step.id);
    const reached = s?.reached ?? 0;
    const left = s?.left ?? 0;
    return {
      step,
      i,
      reached,
      left,
      leftWithAccount: s?.leftWithAccount ?? 0,
      skipped: s?.skipped ?? 0,
      medianSeconds: s?.medianSeconds ?? null,
      kept: d.devices > 0 ? (reached / d.devices) * 100 : 0,
      exitRate: reached > 0 ? (left / reached) * 100 : 0,
    };
  });
  const worst = rows
    .filter((r) => r.i < PAYWALL && r.left > 0)
    .reduce<FunnelRow | null>((a, r) => (!a || r.left > a.left ? r : a), null);
  return { rows, worst };
}
