import type { AgeKey, Emotion, FeatureKey, Gender, SubscriptionBucket, UserStatus } from "./types";

/* Spanish copy for Tracking enums and the onboarding question keys the app sends (OverIt-Mobile buildAnswers). */

export const QUESTION_LABEL: Record<string, string> = {
  HOW_TIME_SINCE: "¿Cuánto tiempo pasó desde la ruptura?",
  HOW_TIME_RELATIONSHIP_LAST: "¿Cuánto tiempo duró la relación?",
  WHO_MADE_THE_DECISION: "¿Quién tomó la decisión de terminar?",
  WHAT_MOST_INFLUENCED: "¿Qué fue lo que más influyó en la separación?",
  YOUR_EMOTIONS_NOW: "¿Qué emociones te acompañan más?",
  YOUR_ACTIONS_NOW: "¿Qué acciones repetís a diario?",
  YOUR_GOALS: "Sus objetivos",
};
export const QUESTION_ORDER = Object.keys(QUESTION_LABEL);
export const questionLabel = (k: string) => QUESTION_LABEL[k] ?? k;
export const sortQuestions = <T extends { question: string }>(qs: T[]) =>
  [...qs].sort((a, b) => {
    const ia = QUESTION_ORDER.indexOf(a.question);
    const ib = QUESTION_ORDER.indexOf(b.question);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

export const GENDER_LABEL: Record<Gender | "UNKNOWN", string> = {
  FEMALE: "Mujer",
  MALE: "Hombre",
  NON_BINARY: "No binario",
  OTHER: "Otro",
  PREFER_NOT_TO_SAY: "Prefiere no decirlo",
  UNKNOWN: "Sin dato",
};

export const AGE_LABEL: Record<AgeKey, string> = {
  "<18": "Menos de 18",
  "18-24": "18 a 24",
  "25-34": "25 a 34",
  "35-44": "35 a 44",
  "45-54": "45 a 54",
  "55+": "55 o más",
  UNKNOWN: "Sin dato",
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Completó",
  PENDING_SECOND_ONBOARDING: "A medias",
  PENDING_ONBOARDING: "Sin onboarding",
};

export const BUCKET_LABEL: Record<SubscriptionBucket, string> = {
  renews: "Renueva",
  canceledWithAccess: "Canceló, con acceso",
  canceled: "Canceló",
  expired: "Vencida",
  none: "Sin suscripción",
};

export const EMOTION_LABEL: Record<Emotion, string> = {
  HAPPINESS: "Feliz",
  NEUTRAL: "Neutral",
  MELANCHOLY: "Melancolía",
  SADNESS: "Tristeza",
  ANGER: "Enojo",
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  emotions: "Registró su emoción",
  challengesCompleted: "Retos completados",
  resourceReads: "Artículos y tips leídos",
  phraseFavorites: "Frases guardadas",
  chatMessages: "Mensajes a Ninety",
  voiceCalls: "Llamadas con Ninety",
  posts: "Publicaciones",
  comments: "Comentarios",
  postLikes: "Me gusta en publicaciones",
  commentLikes: "Me gusta en comentarios",
};

/** "2026-10-13" (UTC day) → timestamp at local noon, so day labels never shift across time zones. */
export const dayKey = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, dd, 12).getTime();
};
export const ts = (iso: string) => new Date(iso).getTime();

const moneyFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "USD 1.234,50" (currency code from the server). */
export const money = (v: number, currency: string) => `${currency} ${moneyFmt.format(v)}`;

/** Pct 0..100, safe for 0 totals. */
export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

/* A stable avatar color per user (the API does not return the look they picked). */
const LOOKS = ["peach", "mint", "ink", "violet", "lime", "lilac"] as const;
export const lookOf = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return LOOKS[Math.abs(h) % LOOKS.length];
};
