import type { ResolvedTheme } from "./theme";

/** Colours the movie graph draws on its canvas, taken from the theme tokens in common.css. */
export interface GraphColors {
  background: string;
  root: string;
  direct: string;
  indirect: string;
  link: string;
  linkFaded: string;
  label: string;
}

// Used when the stylesheet isn't loaded (e.g. in tests). Keep in step with common.css.
export const FALLBACK_GRAPH_COLORS: Record<ResolvedTheme, GraphColors> = {
  dark: {
    background: "#16151a",
    root: "#c8a96e",
    direct: "#e8e4de",
    indirect: "#6e6a78",
    link: "#3d3a47",
    linkFaded: "rgba(61, 58, 71, 0.3)",
    label: "#e8e4de",
  },
  light: {
    background: "#ffffff",
    root: "#a8823c",
    direct: "#3b3842",
    indirect: "#8d8896",
    link: "#c4beb3",
    linkFaded: "rgba(196, 190, 179, 0.3)",
    label: "#1d1b22",
  },
};

/** "#rrggbb" plus an alpha, as an rgba() string the canvas understands. */
function withAlpha(hex: string, alpha: number): string | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((part) => Number.parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Reads the graph colours from the current theme's CSS custom properties.
 * `theme` picks the fallback, and lets callers re-read when the theme changes.
 */
export function readGraphColors(theme: ResolvedTheme): GraphColors {
  const fallback = FALLBACK_GRAPH_COLORS[theme];
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, otherwise: string) => style.getPropertyValue(name).trim() || otherwise;

  const link = read("--color-border-strong", fallback.link);
  return {
    background: read("--color-surface", fallback.background),
    root: read("--color-accent", fallback.root),
    direct: read("--color-node-direct", fallback.direct),
    indirect: read("--color-node-indirect", fallback.indirect),
    link,
    linkFaded: withAlpha(link, 0.3) ?? fallback.linkFaded,
    label: read("--color-text", fallback.label),
  };
}
