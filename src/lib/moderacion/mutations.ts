import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InboxItem, InboxStatus, ModerationKind } from "./types";

/*
 * Write hooks for Moderación. Every action resolves open reports and writes an audit entry on the server, so they
 * invalidate the whole "moderacion" prefix (lists, counts, inbox, audit). Renaming also touches Trackeo user data.
 */

const BASE = "/api/backoffice";

export type ModerationAction = "remove" | "restore" | "dismiss";

export interface ModerateInput {
  kind: ModerationKind;
  id: string;
  action: ModerationAction;
  reason?: string;
}

export function useModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id, action, reason }: ModerateInput) =>
      api<void>(`${BASE}/moderation/${kind}/${id}/${action}`, {
        method: "POST",
        body: action === "remove" ? { reason: reason?.trim() || undefined } : undefined,
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["moderacion"] }),
  });
}

export function useSetInboxStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, id, status }: { source: InboxItem["source"]; id: string; status: InboxStatus }) =>
      api<void>(`${BASE}/inbox/${source}/${id}`, { method: "PATCH", body: { status } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["moderacion"] }),
  });
}

export function useRenameUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<void>(`${BASE}/users/${id}`, { method: "PATCH", body: { name } }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["moderacion"] });
      qc.invalidateQueries({ queryKey: ["trackeo"] });
    },
  });
}
