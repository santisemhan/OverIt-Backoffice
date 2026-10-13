import type { DashboardAuthResponse } from "./types";

/*
 * The admin session lives in a cookie (same approach as OverIt-Creators).
 *
 * What that buys: the browser drops it on its own at `expiresAtUtc`, `SameSite=Lax` keeps it out of cross-site
 * requests, and it is readable by the server side of this app if a server-side guard is ever needed.
 *
 * What it does not buy: it cannot be `HttpOnly`, because the fetch layer puts the token in the `Authorization`
 * header itself, so an XSS can still read it. Closing that needs the backend to set and accept the cookie.
 */

const COOKIE_NAME = "overit.backoffice.session";

/**
 * Cross-tab notification only, never the session itself. Cookies fire no `storage` event, so a tab that signs out
 * writes a timestamp here and the other tabs re-read the cookie.
 */
const PING_KEY = "overit.backoffice.session-ping";

/** Lets the fetch layer notify the app that the session changed in this tab. */
export const SESSION_EVENT = "overit-backoffice-session-change";

export type Session = DashboardAuthResponse;

function cookieAttributes(expiresAtUtc: string): string {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  return `path=/; expires=${new Date(expiresAtUtc).toUTCString()}; samesite=lax${secure}`;
}

function readRawCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME.replace(/\./g, "\\.")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function parse(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    // The browser expires the cookie itself, but a clock change can still leave a stale value readable here.
    if (new Date(session.expiresAtUtc).getTime() <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** The stored session, or null once it has expired, so an expired token is never sent. */
export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  return parse(readRawCookie());
}

export function writeSession(session: Session): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}; ${cookieAttributes(session.expiresAtUtc)}`;
  notify();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  notify();
}

function notify(): void {
  window.localStorage.setItem(PING_KEY, String(Date.now()));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// --- External store adapter -----------------------------------------------------------------------------------
//
// The cookie is an external store, subscribed to with useSyncExternalStore. getSnapshot must return a stable value
// or React re-renders forever, hence the cache keyed on the raw string.

let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

export function subscribeToSession(onChange: () => void): () => void {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  // The cookie expires silently; re-check when the tab comes back so an expired session logs out.
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

export function getSessionSnapshot(): Session | null {
  const raw = readRawCookie();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
  }
  return cachedSession;
}

/** There is no session during server rendering, by definition. */
export function getServerSessionSnapshot(): Session | null {
  return null;
}
