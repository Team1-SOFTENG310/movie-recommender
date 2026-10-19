import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";
import { fetchHistory, type HistoryPage } from "../api/history";
import { fetchMovieSummary, type MovieSummary } from "../api/movieDetails";
import Profile from "./Profile";

vi.mock("../api/history", () => ({
  fetchHistory: vi.fn<(page?: number, signal?: AbortSignal) => Promise<HistoryPage>>(),
  clearHistory: vi.fn<() => Promise<void>>(),
  recordView: vi.fn<(movieId: number) => Promise<void>>(),
}));

vi.mock("../api/movieDetails", () => ({
  fetchMovieSummary: vi.fn<(movieId: number, signal?: AbortSignal) => Promise<MovieSummary>>(),
}));

const accountA = { id: "account-a", username: "account_a", email: "a@example.com" };
const accountB = { id: "account-b", username: "account_b", email: "b@example.com" };

// Movie titles by id, served by the fetchMovieSummary mock.
const titles: Record<number, string> = {
  111: "Account A Movie",
  112: "Account A Second Movie",
  123: "Recovered Movie",
  222: "Account B Movie",
  333: "Account A Late Movie",
};

function historyPage(movieIds: number[], page = 1, totalPages = 1): HistoryPage {
  return {
    history: movieIds.map((movieId) => ({ movieId, viewedAt: "2026-10-18T09:30:00.000Z" })),
    page,
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

function historyRegion() {
  return screen.getByRole("region", { name: "Viewing history" });
}

describe("Profile viewing history", () => {
  beforeEach(() => {
    vi.mocked(fetchHistory).mockReset();
    vi.mocked(fetchMovieSummary)
      .mockReset()
      .mockImplementation((movieId) =>
        Promise.resolve({ id: movieId, title: titles[movieId] ?? `Movie ${movieId}`, year: 2024, posterUrl: null }),
      );
  });

  it("shows loading until the history request finishes", async () => {
    const pending = deferred<HistoryPage>();
    vi.mocked(fetchHistory).mockReturnValueOnce(pending.promise);

    render(profileTree());

    expect(within(historyRegion()).getByRole("status")).toHaveTextContent("Loading your history…");

    await act(async () => {
      pending.resolve(historyPage([], 1, 0));
      await pending.promise;
    });

    expect(await within(historyRegion()).findByText(/Movies you open will appear here/)).toBeInTheDocument();
    expect(within(historyRegion()).queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the date and time each movie was viewed", async () => {
    vi.mocked(fetchHistory).mockResolvedValueOnce(historyPage([111]));

    render(profileTree());

    const link = await within(historyRegion()).findByRole("link", { name: /Account A Movie/ });
    const viewedAt = within(link).getByText((_, element) => element?.tagName === "TIME");

    expect(viewedAt).toHaveAttribute("dateTime", "2026-10-18T09:30:00.000Z");
    expect(viewedAt.textContent).toMatch(/2026/);
    expect(viewedAt.textContent).toMatch(/\d{1,2}[:.]\d{2}/);
  });

  it("loads the next page with Load more, then hides the button on the last page", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchHistory)
      .mockResolvedValueOnce(historyPage([111], 1, 2))
      .mockResolvedValueOnce(historyPage([112], 2, 2));

    render(profileTree());

    await within(historyRegion()).findByRole("link", { name: /Account A Movie/ });
    await user.click(within(historyRegion()).getByRole("button", { name: "Load more" }));

    expect(await within(historyRegion()).findByRole("link", { name: /Account A Second Movie/ })).toBeInTheDocument();
    expect(within(historyRegion()).getAllByRole("link", { name: /Account A/ })).toHaveLength(2);
    expect(vi.mocked(fetchHistory).mock.calls[1]?.[0]).toBe(2);
    expect(within(historyRegion()).queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("keeps the loaded movies and lets Load more retry when the next page fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchHistory)
      .mockResolvedValueOnce(historyPage([111], 1, 2))
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(historyPage([112], 2, 2));

    render(profileTree());

    await within(historyRegion()).findByRole("link", { name: /Account A Movie/ });
    await user.click(within(historyRegion()).getByRole("button", { name: "Load more" }));

    expect(await within(historyRegion()).findByRole("alert")).toHaveTextContent(
      "Couldn't load more of your history. Please try again.",
    );
    expect(within(historyRegion()).getByRole("link", { name: /Account A Movie/ })).toBeInTheDocument();

    await user.click(within(historyRegion()).getByRole("button", { name: "Load more" }));

    expect(await within(historyRegion()).findByRole("link", { name: /Account A Second Movie/ })).toBeInTheDocument();
    expect(within(historyRegion()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a friendly error without the raw message, and retries", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchHistory)
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(historyPage([123]));

    render(profileTree());

    expect(await within(historyRegion()).findByRole("alert")).toHaveTextContent("Couldn't load your viewing history.");
    expect(screen.queryByText("HTTP 503")).not.toBeInTheDocument();

    await user.click(within(historyRegion()).getByRole("button", { name: "Try again" }));

    expect(await within(historyRegion()).findByRole("link", { name: /Recovered Movie/ })).toHaveAttribute(
      "href",
      "/movie/123",
    );
    expect(fetchHistory).toHaveBeenCalledTimes(2);
  });

  it("ignores the previous account's delayed first page", async () => {
    const oldRequest = deferred<HistoryPage>();
    vi.mocked(fetchHistory)
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(historyPage([222]));

    const view = render(profileTree(accountA));
    await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));
    const oldSignal = vi.mocked(fetchHistory).mock.calls[0]?.[1];

    view.rerender(profileTree(accountB));

    expect(await screen.findByRole("link", { name: /Account B Movie/ })).toBeInTheDocument();
    expect(oldSignal?.aborted).toBe(true);

    // Resolve the cancelled request anyway, to check its result is still ignored.
    await act(async () => {
      oldRequest.resolve(historyPage([111]));
      await oldRequest.promise;
    });

    expect(screen.getByRole("link", { name: /Account B Movie/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Account A Movie/ })).not.toBeInTheDocument();
  });

  it("ignores a delayed Load more response after an account change", async () => {
    const user = userEvent.setup();
    const oldMoreRequest = deferred<HistoryPage>();
    vi.mocked(fetchHistory)
      .mockResolvedValueOnce(historyPage([111], 1, 2))
      .mockReturnValueOnce(oldMoreRequest.promise)
      .mockResolvedValueOnce(historyPage([222]));

    const view = render(profileTree(accountA));
    await screen.findByRole("link", { name: /Account A Movie/ });

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
    const oldSignal = vi.mocked(fetchHistory).mock.calls[1]?.[1];

    view.rerender(profileTree(accountB));

    await screen.findByRole("link", { name: /Account B Movie/ });
    expect(oldSignal?.aborted).toBe(true);

    await act(async () => {
      oldMoreRequest.resolve(historyPage([333], 2, 2));
      await oldMoreRequest.promise;
    });

    expect(screen.getByRole("link", { name: /Account B Movie/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Account A/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Loading…" })).not.toBeInTheDocument();
  });
});
