/*
 * Per-browser UI preferences (last section per area, collapsed sidebar groups). Never data: storage can be empty or
 * throw (private mode, blocked site data), so every access is guarded and callers get the fallback.
 */
const PREFIX = "overit.backoffice.";

export function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Preferences are a convenience; losing one is fine.
  }
}
