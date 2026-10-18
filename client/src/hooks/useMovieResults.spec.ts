import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useMovieResults } from "./useMovieResults";
import type { DiscoverFilters } from "../api/discoverMovies";
import { RESULTS_FETCH_DEBOUNCE_MS } from "../constants/debounce";

// Filters are declared once rather than inline so every render passes the
// same object; a new object per render would restart the hook's fetch.
const ACTION_GENRE: DiscoverFilters = { genre: 28 };
const GENRE_OF_TEST_MOVIE: DiscoverFilters = { genre: 1 };
const UNUSED_GENRE: DiscoverFilters = { genre: 999 };
const NO_FILTERS: DiscoverFilters = {};

async function advancePastFetchDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RESULTS_FETCH_DEBOUNCE_MS);
  });
}

describe("useMovieResults", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses discover results when there is no query but filters are set", async () => {
    const { result } = renderHook(() => useMovieResults("", ACTION_GENRE));

    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.movies).toHaveLength(1));
    expect(result.current.movies[0]?.title).toBe("TestDiscoverMovie");
  });

  it("uses search results and applies client-side filtering when a query is set", async () => {
    const { result } = renderHook(() => useMovieResults("test", GENRE_OF_TEST_MOVIE));

    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.movies).toHaveLength(1);
    expect(result.current.movies[0]?.title).toBe("TestMovie1");
  });

  it("filters out search results that don't match the genre filter", async () => {
    const { result } = renderHook(() => useMovieResults("test", UNUSED_GENRE));

    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.movies).toHaveLength(0);
  });

  it("returns no movies and makes no request when there's no query and no filters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useMovieResults("", NO_FILTERS));

    await advancePastFetchDebounce();

    expect(result.current.movies).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
