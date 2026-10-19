import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../context/AuthContext";
import {
  getViewingHistory,
  type ViewingHistoryItem,
  type ViewingHistoryPage,
} from "../api/viewingHistory";
import Profile from "./Profile";

vi.mock("../api/viewingHistory", () => ({
  getViewingHistory:
    vi.fn<
      (
        page?: number,
        limit?: number,
        signal?: AbortSignal,
      ) => Promise<ViewingHistoryPage>
    >(),
}));

const accountA = {
  id: "account-a",
  username: "account_a",
  email: "a@example.com",
};

const accountB = {
  id: "account-b",
  username: "account_b",
  email: "b@example.com",
};

function entry(movieId: number, title: string): ViewingHistoryItem {
  return {
    movieId,
    title,
    posterPath: null,
    releaseDate: "2024-01-01",
    lastViewedAt: "2026-10-18T00:00:00.000Z",
  };
}

function historyPage(
  items: ViewingHistoryItem[],
  page = 1,
  totalPages = 1,
): ViewingHistoryPage {
  return {
    items,
    page,
    limit: 20,
    total: totalPages * 20,
    totalPages,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });

  return { promise, resolve };
}

function profileTree(account = accountA) {
  const value: AuthContextValue = {
    user: account,
    isAuthenticated: true,
    isLoading: false,
    setUser: vi.fn<AuthContextValue["setUser"]>(),
    logout: vi.fn<AuthContextValue["logout"]>(),
  };

  return (
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Profile viewing-history regression tests", () => {
  beforeEach(() => {
    vi.mocked(getViewingHistory).mockReset();
  });

  it("shows loading until the history request finishes", async () => {
    const pending = deferred<ViewingHistoryPage>();

    vi.mocked(getViewingHistory).mockReturnValueOnce(
      pending.promise,
    );

    render(profileTree());

    expect(
      screen.getByText("Loading viewing history…"),
    ).toBeInTheDocument();

    await act(async () => {
      pending.resolve(historyPage([]));
      await pending.promise;
    });

    expect(
      await screen.findByText("You haven’t viewed any movies yet."),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Loading viewing history…"),
    ).not.toBeInTheDocument();
  });

  it("shows a friendly retrieval error and successfully retries", async () => {
    const user = userEvent.setup();

    vi.mocked(getViewingHistory)
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(
        historyPage([entry(123, "Recovered Movie")]),
      );

    render(profileTree());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load viewing history. Please try again.",
    );

    expect(screen.queryByText("HTTP 503")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Retry" }),
    );

    expect(
      await screen.findByRole("link", { name: /Recovered Movie/ }),
    ).toHaveAttribute("href", "/movie/123");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    expect(getViewingHistory).toHaveBeenCalledTimes(2);
  });

  it("ignores the previous account's delayed initial response", async () => {
    const oldRequest = deferred<ViewingHistoryPage>();

    vi.mocked(getViewingHistory)
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(
        historyPage([entry(222, "Account B Movie")]),
      );

    const view = render(profileTree(accountA));

    await waitFor(() => {
      expect(getViewingHistory).toHaveBeenCalledTimes(1);
    });

    const oldSignal =
      vi.mocked(getViewingHistory).mock.calls[0]?.[2];

    expect(oldSignal).toBeDefined();

    view.rerender(profileTree(accountB));

    expect(
      await screen.findByRole("link", { name: /Account B Movie/ }),
    ).toBeInTheDocument();

    expect(oldSignal?.aborted).toBe(true);

    // Deliberately resolve even after cancellation to verify the
    // component also guards its state updates.
    await act(async () => {
      oldRequest.resolve(
        historyPage([entry(111, "Account A Movie")]),
      );
      await oldRequest.promise;
    });

    expect(
      screen.getByRole("link", { name: /Account B Movie/ }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /Account A Movie/ }),
    ).not.toBeInTheDocument();
  });

  it("ignores a delayed load-more response after an account change", async () => {
    const user = userEvent.setup();
    const oldMoreRequest = deferred<ViewingHistoryPage>();

    vi.mocked(getViewingHistory)
      .mockResolvedValueOnce(
        historyPage([entry(111, "Account A First Movie")], 1, 2),
      )
      .mockReturnValueOnce(oldMoreRequest.promise)
      .mockResolvedValueOnce(
        historyPage([entry(222, "Account B Movie")]),
      );

    const view = render(profileTree(accountA));

    await screen.findByRole("link", {
      name: /Account A First Movie/,
    });

    await user.click(
      screen.getByRole("button", { name: "Load more" }),
    );

    expect(
      screen.getByText("Loading more history…"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Loading…" }),
    ).toBeDisabled();

    const oldSignal =
      vi.mocked(getViewingHistory).mock.calls[1]?.[2];

    expect(oldSignal).toBeDefined();

    view.rerender(profileTree(accountB));

    await screen.findByRole("link", {
      name: /Account B Movie/,
    });

    expect(oldSignal?.aborted).toBe(true);

    await act(async () => {
      oldMoreRequest.resolve(
        historyPage(
          [entry(333, "Account A Late Movie")],
          2,
          2,
        ),
      );
      await oldMoreRequest.promise;
    });

    expect(
      screen.getByRole("link", { name: /Account B Movie/ }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /Account A/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Loading more history…"),
    ).not.toBeInTheDocument();
  });
});
