import { clearSession, readSession } from "./session";

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:5000").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Query string values; undefined, null and "" are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Login runs before a session exists. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

/**
 * Typed fetch against OverIt-Backend. Adds the bearer token, parses `{ errorCode, message }` errors into ApiError
 * and, on a 401, drops the session so the guard sends the user back to /login instead of looping on failures.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous = false, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!anonymous) {
    const session = readSession();
    if (!session) {
      clearSession();
      throw new ApiError(401, "DASHBOARD_NO_SESSION", "Tu sesión expiró.");
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}${toQueryString(query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 401 && !anonymous) {
    clearSession();
    throw new ApiError(401, "DASHBOARD_SESSION_EXPIRED", "Tu sesión expiró.");
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload?.errorCode as string) ?? "DASHBOARD_UNEXPECTED_ERROR",
      (payload?.message as string) ?? "Algo salió mal. Intentá de nuevo.",
    );
  }

  return payload as T;
}

function toQueryString(query: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * User-facing copy for the error codes the back office can receive. Anything not listed falls back to the server
 * message, which is already safe to show.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return "No pudimos conectarnos con el servidor. Revisá tu conexión.";
  if (error.status === 429) return "Demasiadas solicitudes seguidas. Esperá un minuto y reintentá.";

  switch (error.errorCode) {
    case "DASHBOARD_INVALID_CREDENTIALS":
      return "Email o contraseña incorrectos.";
    case "DASHBOARD_SESSION_EXPIRED":
    case "DASHBOARD_NO_SESSION":
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    case "DASHBOARD_FORBIDDEN":
      return "Tu cuenta no tiene acceso al Back Office.";
    default:
      return error.message;
  }
}
