import { useContext, useId } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { isThemePreference, type ThemePreference } from "../theme/theme";
import "./ThemeSwitcher.css";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

/**
 * Dark / Light / System theme picker; the choice is saved for next time.
 * Renders nothing outside a ThemeProvider (e.g. a page rendered on its own in a test).
 */
export default function ThemeSwitcher() {
  const theme = useContext(ThemeContext);
  const id = useId();
  if (!theme) return null;
  const { preference, setPreference } = theme;

  return (
    <div className="theme-switcher">
      <label htmlFor={id}>Theme</label>
      <select
        id={id}
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) setPreference(event.target.value);
        }}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
