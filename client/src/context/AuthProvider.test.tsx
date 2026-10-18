import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { getCurrentUser, requestLogout } from "../api/auth";
import type { User } from "../types/user";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn<() => Promise<User | null>>(),
  requestLogout: vi.fn<() => Promise<void>>(),
}));

const testUser: User = {
  id: "user-1",
  username: "film_fan",
  email: "film@example.com",
};

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(requestLogout).mockResolvedValue(undefined);
  });

  it("shows loading until the session check completes", async () => {
    let resolveSession!: (user: User | null) => void;

    const sessionPromise = new Promise<User | null>((resolve) => {
      resolveSession = resolve;
    });

    vi.mocked(getCurrentUser).mockReturnValue(sessionPromise);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      resolveSession(testUser);
      await sessionPromise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toEqual(testUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("provides a logged-out state when there is no session", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("finishes loading safely when session restoration fails", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(
      new Error("Session unavailable"),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("updates the shared authentication state through setUser", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setUser(testUser);
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("clears the current user after successful logout", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(requestLogout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("retains the user and rejects when logout fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);
    vi.mocked(requestLogout).mockRejectedValue(
      new Error("Could not log out"),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow(
        "Could not log out",
      );
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});