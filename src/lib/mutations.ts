import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { DashboardAuthResponse } from "./types";

/*
 * Write hooks. One hook per endpoint; each invalidates exactly the query keys it makes stale (see queries.ts for the
 * key conventions).
 */

/**
 * Admin login. The endpoint is admin-only on the server, but the role is checked again here so a token for any
 * other role is never stored.
 */
export function useAdminLogin() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const res = await api<DashboardAuthResponse>("/api/dashboard/auth/admin/login", {
        method: "POST",
        body: input,
        anonymous: true,
      });
      if (res.role !== "Admin") {
        throw new ApiError(403, "DASHBOARD_FORBIDDEN", "Tu cuenta no tiene acceso al Back Office.");
      }
      return res;
    },
  });
}
