/*
 * Wire types shared with OverIt-Backend. Keep them in the server's shape (camelCase JSON); mapping to view models
 * happens in the page that needs it, not here.
 */

export type DashboardRole = "Creator" | "Admin";

/** POST /api/dashboard/auth/admin/login */
export interface DashboardAuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  role: DashboardRole;
  subjectId: string;
  displayName: string;
  email: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
