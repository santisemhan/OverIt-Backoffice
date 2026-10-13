"use client";

import { useSyncExternalStore } from "react";
import { loadPref, savePref } from "@/lib/prefs";
import { LANGUAGES, type ContentLanguage } from "@/lib/contenido/types";

/*
 * The content language picked in any Contenido section (default "es"). Shared by every section and the sidebar
 * badges, and remembered per browser.
 */
const KEY = "contenido.language";
const listeners = new Set<() => void>();
let current: ContentLanguage | null = null;

function read(): ContentLanguage {
  if (current) return current;
  const v = loadPref<string>(KEY, "es");
  current = LANGUAGES.some((l) => l.id === v) ? (v as ContentLanguage) : "es";
  return current;
}

export function setContentLanguage(lang: ContentLanguage) {
  current = lang;
  savePref(KEY, lang);
  listeners.forEach((l) => l());
}

export function useContentLanguage(): [ContentLanguage, (l: ContentLanguage) => void] {
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "es" as ContentLanguage,
  );
  return [lang, setContentLanguage];
}
