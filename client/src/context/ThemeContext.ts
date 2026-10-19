import { createContext } from "react";
import type { ResolvedTheme, ThemePreference } from "../theme/theme";

export interface ThemeContextValue {
  /** What the user picked: dark, light, or follow the system. */
  preference: ThemePreference;
  /** The theme actually shown, with "system" resolved. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
