import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useMovieResults } from "./useMovieResults";
import * as searchMoviesModule from "../api/searchMovies";
import type { DiscoverFilters } from "../api/discoverMovies";
import { RESULTS_FETCH_DEBOUNCE_MS } from "../constants/debounce";
import type { Movie, SearchMoviesResponse } from "../types/movie";

vi.mock("../api/searchMovies");

// Shared across renders on purpose: a new {} on every render would look
// like a filter change to the hook and restart its fetch effect.
const NO_FILTERS: DiscoverFilters = {};

const THE_SHINING: Movie = {
  id: 1,
  title: "The Shining",
  year: 1980,
  posterUrl: null,
  overview: "",
  genreIds: [27],
  voteAverage: 8.4,
};

const JOHN_WICK: Movie = {
  id: 2,
  title: "John Wick",
  year: 2014,
  posterUrl: null,
  overview: "",
  genreIds: [28],
  voteAverage: 7.4,
};

function responseWith(movie: Movie): SearchMoviesResponse {
  return { results: [movie], page: 1, totalPages: 1, totalResults: 1 };
}

// Fires the hook's debounce timer. Wrapped in act() so state set while
// the timer runs is committed before the test carries on.
async function advancePastFetchDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RESULTS_FETCH_DEBOUNCE_MS);
  });
}

describe("useMovieResults race condition handling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("discards a stale response that resolves after a newer request has already completed", async () => {
    let resolveStaleRequest: (response: SearchMoviesResponse) => void = () => {};
    const staleRequest = new Promise<SearchMoviesResponse>((resolve) => {
      resolveStaleRequest = resolve;
    });

    const searchMoviesMock = vi.mocked(searchMoviesModule.searchMovies);
    searchMoviesMock.mockReturnValueOnce(staleRequest);
    searchMoviesMock.mockResolvedValueOnce(responseWith(JOHN_WICK));

    const { result, rerender } = renderHook(
      ({ query }) => useMovieResults(query, NO_FILTERS),
      { initialProps: { query: "Shining" } },
    );

    // The "Shining" request has to be in flight before the query changes,
    // otherwise there is no stale response to discard.
    await advancePastFetchDebounce();
    expect(searchMoviesMock).toHaveBeenCalledTimes(1);
    expect(searchMoviesMock).toHaveBeenLastCalledWith("Shining", 1, expect.any(AbortSignal));

    rerender({ query: "John Wick" });
    await advancePastFetchDebounce();

    await waitFor(() => {
      expect(result.current.movies).toEqual([JOHN_WICK]);
    });

    // Resolve the stale "Shining" request late
    await act(async () => {
      resolveStaleRequest(responseWith(THE_SHINING));
    });

    // Results should still reflect the newer query — the stale response was discarded
    expect(result.current.movies).toEqual([JOHN_WICK]);
    expect(searchMoviesMock).toHaveBeenCalledTimes(2);
  });
});
