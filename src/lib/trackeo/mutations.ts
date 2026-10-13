import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/* Trackeo write hooks. Renaming or granting access changes the person and every list/metric they appear in. */

export function useRenameUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<void>(`/api/backoffice/users/${encodeURIComponent(id)}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["trackeo", "user", id] });
      void qc.invalidateQueries({ queryKey: ["trackeo", "users"] });
    },
  });
}

/** Complimentary access (existing admin endpoint, keyed by email). */
export function useGrantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; expiresAtUtc: string | null; reason: string }) =>
      api<{ grantId: string }>("/api/admin/subscription-grants", { method: "POST", body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["trackeo"] }),
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) =>
      api<void>(`/api/admin/subscription-grants/${encodeURIComponent(grantId)}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["trackeo"] }),
  });
}
