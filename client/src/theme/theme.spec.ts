import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
} from "./theme";

function mockSystemLight(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    })),
  );
}

describe("theme", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("recognises only the three preferences", () => {
    expect(["dark", "light", "system"].every(isThemePreference)).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("defaults to dark when nothing valid is saved", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(readStoredTheme()).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(readStoredTheme()).toBe("dark");
  });

  it("round-trips a saved preference", () => {
    writeStoredTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(readStoredTheme()).toBe("light");
  });

  it("falls back to the default when storage throws", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    expect(readStoredTheme(blocked)).toBe("dark");
    expect(() => writeStoredTheme("light", blocked)).not.toThrow();
  });

  it("resolves an explicit choice as itself", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it.each([
    [true, "light"],
    [false, "dark"],
  ])("resolves System to the operating system setting (prefers light: %s)", (prefersLight, expected) => {
    mockSystemLight(prefersLight);
    expect(resolveTheme("system")).toBe(expected);
  });

  it("resolves System to dark where the browser can't report a preference", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(resolveTheme("system")).toBe("dark");
  });

  it("applies a theme to the root element", () => {
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
