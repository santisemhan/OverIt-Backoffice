import type { AgeKey, Emotion, FeatureKey, Gender, Overview, SubscriptionBucket, UserStatus } from "./types";

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

/* Older app versions stored the question title (es or en, OverIt-Mobile src/common/i18n) as the key. */
export const QUESTION_ALIAS: Record<string, string> = {
  "How long has it been since the breakup?": "HOW_TIME_SINCE",
  "¿Cuánto tiempo pasó desde la ruptura?": "HOW_TIME_SINCE",
  "How long did the relationship last?": "HOW_TIME_RELATIONSHIP_LAST",
  "¿Cuánto tiempo duró la relación?": "HOW_TIME_RELATIONSHIP_LAST",
  "Who decided to end the relationship?": "WHO_MADE_THE_DECISION",
  "¿Quién tomó la decisión de terminar la relación?": "WHO_MADE_THE_DECISION",
  "What most influenced the breakup?": "WHAT_MOST_INFLUENCED",
  "¿Qué fue lo que más influyó en la separación?": "WHAT_MOST_INFLUENCED",
  "What emotions have been with you most?": "YOUR_EMOTIONS_NOW",
  "¿Qué emociones te acompañan más?": "YOUR_EMOTIONS_NOW",
  "What actions do you feel you repeat daily?": "YOUR_ACTIONS_NOW",
  "¿Qué acciones sientes que repites a diario?": "YOUR_ACTIONS_NOW",
  "¿Qué acciones sentís que repetís a diario?": "YOUR_ACTIONS_NOW",
  "Choose your goals": "YOUR_GOALS",
  "Elige tus objetivos": "YOUR_GOALS",
};
export const questionKey = (k: string) => QUESTION_ALIAS[k] ?? k;
export const questionLabel = (k: string) => QUESTION_LABEL[questionKey(k)] ?? k;
export const sortQuestions = <T extends { question: string }>(qs: T[]) =>
  [...qs].sort((a, b) => {
    const ia = QUESTION_ORDER.indexOf(a.question);
    const ib = QUESTION_ORDER.indexOf(b.question);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

export const ANSWER_LABEL: Record<string, string> = {
  "Less than a week": "Menos de una semana",
  "1 to 4 weeks": "1 a 4 semanas",
  "1 to 6 months": "1 a 6 meses",
  "More than 6 months": "Más de 6 meses",
  "Less than a year": "Menos de un año",
  "1 to 5 years": "1 a 5 años",
  "5 to 10 years": "5 a 10 años",
  "More than 10 years": "Más de 10 años",
  "I did": "Yo",
  "My ex": "Mi ex",
  "It was mutual": "Fue mutuo",
  Infidelity: "Infidelidad",
  "Emotional or physical distance": "Distancia emocional o física",
  "Wear and routine": "Desgaste o rutina",
  "It wasn’t what I was looking for": "No era lo que buscaba",
  "I don’t know": "No lo se",
  Anxiety: "Ansiedad",
  "Sadness / Melancholy": "Tristeza / Melancolía",
  Confusion: "Confusión",
  Anger: "Ira o enojo",
  Guilt: "Culpa",
  "Another emotion": "Otra emoción",
  "Checking their social media": "Revisar sus redes sociales",
  "Rereading conversations": "Releer conversaciones",
  "Looking at photos/videos together": "Mirar fotos/videos juntos",
  "Imagining a reunion": "Imaginar un reencuentro",
  "Typing a message and deleting it": "Escribirle y borrar el mensaje",
  "Isolating myself from friends or family": "Aislarme de amigos o familia",
  "Stop thinking about it all day": "No pensar más todo el día en eso",
  "Rebuild my self-esteem": "Reconstruir mi autoestima",
  "Stop idealizing the relationship": "Dejar de idealizar la relación",
  "Be able to see my ex without pain": "Poder ver a mi ex sin dolor",
  "Trust in love again": "Volver a confiar en el amor",
  "More energy and motivation": "Más energía y motivación",
};
export const answerLabel = (k: string) => ANSWER_LABEL[k] ?? k;

export interface MergedAnswer {
  label: string;
  count: number;
  /** Every stored value (es and en) behind this label. */
  values: string[];
}
export interface MergedQuestion {
  question: string;
  /** Every stored key (current key and older titles) behind this question. */
  keys: string[];
  answered: number;
  options: MergedAnswer[];
}

/** The answer distribution with en answers and older question titles folded into their Spanish row. */
export function mergeAnswers(qs: Overview["onboardingAnswers"]): MergedQuestion[] {
  const byQuestion = new Map<string, { keys: string[]; answered: number; options: Map<string, MergedAnswer> }>();
  for (const q of qs) {
    const key = questionKey(q.question);
    const group = byQuestion.get(key) ?? { keys: [], answered: 0, options: new Map<string, MergedAnswer>() };
    group.keys.push(q.question);
    group.answered += q.answered;
    for (const o of q.options) {
      const label = answerLabel(o.answer);
      const opt = group.options.get(label) ?? { label, count: 0, values: [] };
      opt.count += o.count;
      if (!opt.values.includes(o.answer)) opt.values.push(o.answer);
      group.options.set(label, opt);
    }
    byQuestion.set(key, group);
  }
  return sortQuestions(
    [...byQuestion.entries()].map(([question, g]) => ({
      question,
      keys: g.keys,
      answered: g.answered,
      options: [...g.options.values()].sort((a, b) => b.count - a.count),
    })),
  );
}

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
