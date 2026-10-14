import type { Tone } from "@/components/ui/Badge";
import type { ToneId } from "@/lib/tones";
import type { InboxStatus, InboxType, ModerationFlag, ReportReason } from "@/lib/moderation/types";

export const REASON: Record<ReportReason, string> = {
  Spam: "Spam",
  Harassment: "Acoso",
  Hate: "Odio",
  Inappropriate: "Inapropiado",
  SelfHarm: "Autolesión",
  Other: "Otro motivo",
};
export const reasonLabel = (r: string | null) => (r ? (REASON[r as ReportReason] ?? r) : null);

export const FLAG: Record<ModerationFlag, { label: string; tone: Tone; help: string }> = {
  SelfHarm: {
    label: "Posible riesgo",
    tone: "bad",
    help: "Habla de hacerse daño o de no querer seguir. Revisala primero y considerá escribirle con recursos de ayuda; no la borres sin revisar.",
  },
  Harassment: { label: "Acoso", tone: "bad", help: "Ataca, insulta o intimida a otra persona." },
  Hate: { label: "Odio", tone: "bad", help: "Insultos o generalizaciones que ofenden a un grupo." },
  Violence: { label: "Violencia", tone: "bad", help: "Amenazas o descripciones de violencia." },
  Sexual: { label: "Contenido sexual", tone: "warn", help: "Contenido sexual explícito o insinuaciones." },
  PersonalData: {
    label: "Datos personales",
    tone: "warn",
    help: "Comparte un teléfono, una dirección o datos que identifican a alguien.",
  },
  Spam: { label: "Venta o spam", tone: "warn", help: "Ofrece productos o servicios, o lleva a otra red o sitio." },
  Other: {
    label: "Otra alerta",
    tone: "warn",
    help: "Algo que no encaja en lo anterior pero conviene que mire una persona.",
  },
};

export const STATUS: Record<InboxStatus, { label: string; tone: Tone }> = {
  New: { label: "Nuevo", tone: "info" },
  InReview: { label: "En revisión", tone: "warn" },
  Resolved: { label: "Resuelto", tone: "ok" },
};

export const TYPES: InboxType[] = [
  "report",
  "bug",
  "suggestion",
  "other",
  "subscriptionCancellation",
  "accountDeletion",
];

export const TYPE: Record<InboxType, { label: string; look: ToneId }> = {
  report: { label: "Reporte de la comunidad", look: "peach" },
  bug: { label: "Error", look: "rose" },
  suggestion: { label: "Sugerencia", look: "lime" },
  other: { label: "Otro", look: "sand" },
  subscriptionCancellation: { label: "Cancelación", look: "lilac" },
  accountDeletion: { label: "Cuenta eliminada", look: "sky" },
};
