import type { Tone } from "@/components/ui/Badge";
import type { ToneId } from "@/lib/tones";
import type { InboxStatus, InboxType, ReportReason } from "@/lib/moderation/types";

export const REASON: Record<ReportReason, string> = {
  Spam: "Spam",
  Harassment: "Acoso",
  Hate: "Odio",
  Inappropriate: "Inapropiado",
  SelfHarm: "Autolesión",
  Other: "Otro motivo",
};
export const reasonLabel = (r: string | null) => (r ? (REASON[r as ReportReason] ?? r) : null);

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
