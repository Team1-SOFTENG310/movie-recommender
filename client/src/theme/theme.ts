// Theme preference handling, kept free of React so it can be tested on its own.
// index.html repeats the read-and-apply step inline, before the app loads, so the
// page never flashes the wrong theme; keep the two in step.

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME: ThemePreference = "dark";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

/** The saved preference, or the default when there is none or storage is unavailable. */
export function readStoredTheme(storage: Storage | undefined = globalThis.localStorage): ThemePreference {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(
  preference: ThemePreference,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private browsing or blocked storage: the choice still applies for this visit.
  }
}

/** The system's colour scheme query, if the browser supports it. */
export function systemThemeQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(LIGHT_QUERY)
    : null;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") {
    return preference;
  }
  return systemThemeQuery()?.matches ? "light" : "dark";
}

/** Switches the page's colour tokens (see common.css). */
export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}
