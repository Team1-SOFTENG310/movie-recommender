import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  systemThemeQuery,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "../theme/theme";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveTheme("system"));

  const resolvedTheme = preference === "system" ? systemTheme : preference;
  const preferenceRef = useRef(preference);

  // Follow the operating system's setting while it changes, e.g. at sunset.
  useEffect(() => {
    const query = systemThemeQuery();
    if (!query) return;
    const onChange = () => {
      const next = query.matches ? "light" : "dark";
      // Apply before re-rendering, so components that read the colour tokens
      // during render (the graph canvas) already see the new values.
      if (preferenceRef.current === "system") applyTheme(next);
      setSystemTheme(next);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (next) => {
        writeStoredTheme(next);
        applyTheme(next === "system" ? systemTheme : next);
        preferenceRef.current = next;
        setPreferenceState(next);
      },
    }),
    [preference, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
