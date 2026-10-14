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

/** ISO alpha-2 → the numeric id each country has in the DotMap (components/ui/mapDots.ts). */
export const MAP_ID: Record<string, string> = {
  DZ: "012",
  AD: "020",
  AG: "028",
  AR: "032",
  BS: "044",
  BB: "052",
  BE: "056",
  BM: "060",
  BO: "068",
  BR: "076",
  BZ: "084",
  VG: "092",
  CA: "124",
  CV: "132",
  KY: "136",
  CL: "152",
  CO: "170",
  CR: "188",
  CU: "192",
  BJ: "204",
  DM: "212",
  DO: "214",
  EC: "218",
  SV: "222",
  FK: "238",
  GS: "239",
  FR: "250",
  GM: "270",
  DE: "276",
  GH: "288",
  GD: "308",
  GT: "320",
  GN: "324",
  GY: "328",
  HT: "332",
  HN: "340",
  CI: "384",
  JM: "388",
  LR: "430",
  ML: "466",
  MR: "478",
  MX: "484",
  MS: "500",
  MA: "504",
  CW: "531",
  AW: "533",
  SX: "534",
  NI: "558",
  NE: "562",
  NG: "566",
  PA: "591",
  PY: "600",
  PE: "604",
  PT: "620",
  GW: "624",
  PR: "630",
  SH: "654",
  AI: "660",
  LC: "662",
  PM: "666",
  SN: "686",
  SL: "694",
  ES: "724",
  EH: "732",
  SR: "740",
  CH: "756",
  TG: "768",
  TT: "780",
  TC: "796",
  GG: "831",
  JE: "832",
  US: "840",
  VI: "850",
  BF: "854",
  UY: "858",
  VE: "862",
};
