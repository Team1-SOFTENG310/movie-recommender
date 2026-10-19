// Runs against the real stylesheets on disk (Vitest stubs CSS imports to empty strings),
// so it's type-checked with tsconfig.node.json rather than the browser app config.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// WCAG 2.2 AA: 4.5:1 for normal text (1.4.3), 3:1 for focus indicators and
// graphical objects such as the graph's nodes (1.4.11).
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const commonCss = readFileSync(join(SRC, "common.css"), "utf8");

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

// Every stylesheet in src/, as text, so the tokens they use can be checked.
const stylesheets = Object.fromEntries(cssFiles(SRC).map((file) => [file, readFileSync(file, "utf8")]));

/** The custom properties declared in the rule whose selector contains `selector`. */
function tokensFor(selector: string): Record<string, string> {
  const start = commonCss.indexOf(selector);
  if (start === -1) throw new Error(`No rule for ${selector} in common.css`);
  const body = commonCss.slice(commonCss.indexOf("{", start) + 1, commonCss.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--color-[a-z-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

function luminance(hex: string): number {
  const channels = hex.replace("#", "").match(/../g);
  if (!channels || channels.length !== 3) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = channels.map((part) => {
    const value = Number.parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const THEMES = {
  dark: tokensFor(':root[data-theme="dark"]'),
  light: tokensFor(':root[data-theme="light"]'),
};

const TEXT_COLOURS = [
  "--color-text",
  "--color-text-strong",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-text-subtle",
  "--color-accent-text",
  "--color-danger",
];
const BACKGROUNDS = ["--color-bg", "--color-surface", "--color-surface-raised", "--color-surface-hover"];

describe.each(Object.entries(THEMES))("%s theme", (_name, tokens) => {
  const colour = (token: string) => {
    const value = tokens[token];
    if (!value) throw new Error(`${token} is not defined`);
    return value;
  };

  it.each(TEXT_COLOURS.flatMap((text) => BACKGROUNDS.map((background) => [text, background])))(
    "%s on %s meets 4.5:1",
    (text, background) => {
      expect(contrast(colour(text), colour(background))).toBeGreaterThanOrEqual(TEXT_MIN);
    },
  );

  it.each(["--color-accent", "--color-accent-hover"])("text on %s buttons meets 4.5:1", (fill) => {
    expect(contrast(colour("--color-on-accent"), colour(fill))).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it.each(["--color-bg", "--color-surface"])("focus rings (accent) on %s meet 3:1", (background) => {
    expect(contrast(colour("--color-accent"), colour(background))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });

  it.each(["--color-accent", "--color-node-direct", "--color-node-indirect"])(
    "graph nodes in %s meet 3:1 on the graph background",
    (node) => {
      expect(contrast(colour(node), colour("--color-surface"))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    },
  );
});

describe("theme tokens", () => {
  it("define the same tokens in both themes", () => {
    expect(Object.keys(THEMES.light).sort()).toEqual(Object.keys(THEMES.dark).sort());
  });

  it("cover every colour token the stylesheets use", () => {
    expect(Object.keys(stylesheets).length).toBeGreaterThan(10);
    const used = new Set(
      Object.values(stylesheets).flatMap((css) => [...css.matchAll(/var\((--color-[a-z-]+)\)/g)].map((m) => m[1])),
    );
    const undefinedTokens = [...used].filter((token) => token && !(token in THEMES.dark));
    expect(undefinedTokens).toEqual([]);
  });
});
