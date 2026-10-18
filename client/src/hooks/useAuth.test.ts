import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuth } from "./useAuth";

describe("useAuth", () => {
  it("throws a helpful error outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used inside an AuthProvider");
  });
});