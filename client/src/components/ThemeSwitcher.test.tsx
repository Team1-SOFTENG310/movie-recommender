import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ThemeSwitcher from "./ThemeSwitcher";
import { ThemeProvider } from "../context/ThemeProvider";
import { THEME_STORAGE_KEY } from "../theme/theme";

/** A controllable prefers-color-scheme: light media query. */
function mockSystemTheme(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersLight,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  return {
    change(nextPrefersLight: boolean) {
      query.matches = nextPrefersLight;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

function renderSwitcher() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
}

const themeSelect = () => screen.getByRole("combobox", { name: "Theme" });

describe("ThemeSwitcher", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it("starts in the dark theme", () => {
    renderSwitcher();

    expect(themeSelect()).toHaveValue("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("restores the saved preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderSwitcher();

    expect(themeSelect()).toHaveValue("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("switches theme immediately and remembers the choice", async () => {
    renderSwitcher();

    await userEvent.selectOptions(themeSelect(), "light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("follows the operating system when set to System, including later changes", async () => {
    const system = mockSystemTheme(true);
    renderSwitcher();

    await userEvent.selectOptions(themeSelect(), "system");
    expect(document.documentElement.dataset.theme).toBe("light");

    system.change(false);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores operating system changes while a theme is chosen explicitly", async () => {
    const system = mockSystemTheme(false);
    renderSwitcher();

    await userEvent.selectOptions(themeSelect(), "dark");
    system.change(true);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("renders nothing without a ThemeProvider", () => {
    const { container } = render(<ThemeSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
