import { afterEach, describe, expect, it } from "vitest";
import { FALLBACK_GRAPH_COLORS, readGraphColors } from "./graphColors";

describe("readGraphColors", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("uses the theme's fallback colours when no stylesheet is loaded", () => {
    expect(readGraphColors("dark")).toEqual(FALLBACK_GRAPH_COLORS.dark);
    expect(readGraphColors("light")).toEqual(FALLBACK_GRAPH_COLORS.light);
  });

  it("reads the colour tokens, and derives the faded link colour from the link colour", () => {
    const root = document.documentElement.style;
    root.setProperty("--color-surface", "#101010");
    root.setProperty("--color-accent", "#aa8844");
    root.setProperty("--color-border-strong", "#204060");

    const colors = readGraphColors("dark");

    expect(colors.background).toBe("#101010");
    expect(colors.root).toBe("#aa8844");
    expect(colors.link).toBe("#204060");
    expect(colors.linkFaded).toBe("rgba(32, 64, 96, 0.3)");
    expect(colors.label).toBe(FALLBACK_GRAPH_COLORS.dark.label);
  });
});
