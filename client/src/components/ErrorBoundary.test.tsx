import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function Broken(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("shows its children when nothing goes wrong", () => {
    render(
      <ErrorBoundary>
        <p>Page content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("replaces a crashed page with a message and a reload button", () => {
    // React logs the caught error; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
  });
});
