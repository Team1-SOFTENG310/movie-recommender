import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { useMovieResults } from "./useMovieResults";
import type { DiscoverFilters } from "../api/discoverMovies";
import { RESULTS_FETCH_DEBOUNCE_MS } from "../constants/debounce";

// Filters are declared once rather than inline so every render passes the
// same object; a new object per render would restart the hook's fetch.
const ACTION_GENRE: DiscoverFilters = { genre: 28 };
const GENRE_OF_TEST_MOVIE: DiscoverFilters = { genre: 1 };
const UNUSED_GENRE: DiscoverFilters = { genre: 999 };
const NO_FILTERS: DiscoverFilters = {};
const FRENCH: DiscoverFilters = { language: "fr" };

function rawMovie(id: number, language = "en", genreIds = [28]) {
  return {
    id,
    title: `Movie ${id}`,
    release_date: "2000-01-01",
    poster_path: null,
    overview: "",
    genre_ids: genreIds,
    vote_average: 7,
    original_language: language,
  };
}

const DRAMA = 18;

// A title search whose pages hold only dramas, except the pages listed in
// `actionPages`; records which pages were requested.
function mockSearchPages(totalPages: number, actionPages: number[]) {
  const requested: number[] = [];
  server.use(
    http.get("https://api.themoviedb.org/3/search/movie", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      requested.push(page);
      const genre = actionPages.includes(page) ? 28 : DRAMA;
      return HttpResponse.json({
        results: [rawMovie(page * 10, "en", [genre])],
        page,
        total_pages: totalPages,
        total_results: totalPages,
      });
    }),
  );
  return requested;
}

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
  it("drops movies already shown when the next page overlaps the last one", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        const results = page === "2" ? [rawMovie(2), rawMovie(3)] : [rawMovie(1), rawMovie(2)];
        return HttpResponse.json({ results, page: Number(page), total_pages: 2, total_results: 4 });
      }),
    );
    const { result } = renderHook(() => useMovieResults("", ACTION_GENRE));
    await advancePastFetchDebounce();
    await waitFor(() => expect(result.current.movies).toHaveLength(2));

    act(() => result.current.loadMore());
    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.movies.map((m) => m.id)).toEqual([1, 2, 3]));
  });

  it("applies the language filter to title search results", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/search/movie", () =>
        HttpResponse.json({
          results: [rawMovie(1, "en"), rawMovie(2, "fr")],
          page: 1,
          total_pages: 1,
          total_results: 2,
        }),
      ),
    );
    const { result } = renderHook(() => useMovieResults("amelie", FRENCH));

    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.movies.map((m) => m.id)).toEqual([2]);
  });

  it("reports a failed request, clears stale results, and can retry it", async () => {
    let fail = true;
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () =>
        fail
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ results: [rawMovie(7)], page: 1, total_pages: 1, total_results: 1 }),
      ),
    );
    const { result } = renderHook(() => useMovieResults("", ACTION_GENRE));
    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.movies).toEqual([]);

    fail = false;
    act(() => result.current.retry());
    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.movies.map((m) => m.id)).toEqual([7]));
    expect(result.current.error).toBeNull();
  });

  it("keeps reading search pages when the filters empty the first ones", async () => {
    const requested = mockSearchPages(4, [3, 4]);
    const { result } = renderHook(() => useMovieResults("star", ACTION_GENRE));
    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.movies.map((m) => m.id)).toEqual([30]));
    expect(requested).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await advancePastFetchDebounce();

    // Carries on after the last page read, rather than re-reading page 2.
    await waitFor(() => expect(result.current.movies.map((m) => m.id)).toEqual([30, 40]));
    expect(requested).toEqual([1, 2, 3, 4]);
    expect(result.current.hasMore).toBe(false);
  });

  it("stops reading ahead after a few empty search pages", async () => {
    const requested = mockSearchPages(20, []);
    const { result } = renderHook(() => useMovieResults("star", ACTION_GENRE));
    await advancePastFetchDebounce();

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.movies).toEqual([]);
    expect(requested).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.hasMore).toBe(true);
  });
});
