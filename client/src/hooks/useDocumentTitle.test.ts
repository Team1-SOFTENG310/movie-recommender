import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  it("names the page in the tab title and restores the old title afterwards", () => {
    document.title = "Before";
    const { rerender, unmount } = renderHook<void, { title: string | null }>(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: "Inception (2010)" } },
    );

    expect(document.title).toBe("Inception (2010) · NetFlicks");

    rerender({ title: null });
    expect(document.title).toBe("NetFlicks");

    unmount();
    expect(document.title).toBe("Before");
  });
});
