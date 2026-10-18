import { useEffect, useRef, useState } from "react";
import { searchMovies } from "../api/searchMovies";
import { discoverMovies, type DiscoverFilters } from "../api/discoverMovies";
import { isAbortError } from "../api/tmdb";
import { RESULTS_FETCH_DEBOUNCE_MS } from "../constants/debounce";
import type { Movie } from "../types/movie";

interface UseMovieResultsResult {
  movies: Movie[];
  isLoading: boolean;
  hasSearched: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  retry: () => void;
}

// Client-side filters can empty a whole page of search results while later pages
// still have matches, so a search keeps going this many pages before showing nothing.
const MAX_SEARCH_PAGES_PER_LOAD = 5;

// TMDB pages can overlap when rankings shift between requests, so a movie on
// page 3 may already have appeared on page 2.
function appendNew(existing: Movie[], incoming: Movie[]): Movie[] {
  const seen = new Set(existing.map((movie) => movie.id));
  return [...existing, ...incoming.filter((movie) => !seen.has(movie.id))];
}

function hasAnyFilter(filters: DiscoverFilters): boolean {
  return Boolean(
    filters.genre ||
      filters.yearFrom ||
      filters.yearTo ||
      filters.language ||
      filters.ratingMin ||
      filters.castId,
  );
}

// Applied only to search results (see the hook below). TMDB's discover
// endpoint already applies genre/year/rating filters server-side, but
// its search endpoint has no filter params at all, so this replicates
// the same filtering logic on whatever search returns.
function applyClientSideFilters(movies: Movie[], filters: DiscoverFilters): Movie[] {
  return movies.filter((movie) => {
    if (filters.genre && !movie.genreIds.includes(filters.genre)) return false;
    if (filters.yearFrom && movie.year !== null && movie.year < filters.yearFrom) return false;
    if (filters.yearTo && movie.year !== null && movie.year > filters.yearTo) return false;
    if (filters.ratingMin && (movie.voteAverage ?? 0) < filters.ratingMin) return false;
    if (filters.language && movie.originalLanguage !== filters.language) return false;
    // Note: castId is intentionally NOT checked here. Search results
    // don't include cast data, so actor filtering only works via
    // discoverMovies. FilterPanel disables the actor input whenever a
    // search query is active, so castId should already be undefined
    // by the time filters reaches this function during a search.
    return true;
  });
}

/**
 * Combines free-text search (query) with structured filters, since TMDB
 * has no single endpoint that supports both at once:
 * - query set        -> searchMovies, then filtered client-side above
 * - no query, filters -> discoverMovies (TMDB filters server-side)
 * - neither set        -> empty result set, nothing fetched
 */
export function useMovieResults(query: string, filters: DiscoverFilters): UseMovieResultsResult {
  const [movies, setMovies] = useState<Movie[]>([]);
  // The page a load starts from, and the last page actually fetched (a filtered
  // search can read ahead several pages in one load).
  const [page, setPage] = useState(1);
  const [loadedThrough, setLoadedThrough] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by retry() to re-run the request for the current page.
  const [attempt, setAttempt] = useState(0);

  // Tracks the most recent request so a slow, stale response (e.g. from
  // a query the user has since changed away from) can't overwrite
  // results from a request that started later but resolved first.
  const requestIdRef = useRef(0);

  // Reset to page 1 whenever the query or filters change, so switching
  // filters mid-scroll doesn't append page-3 results onto a brand new
  // filter set. Done during render rather than in an effect, so the fetch
  // below never starts for the old page number first.
  const [searchedFor, setSearchedFor] = useState({ query, filters });
  if (searchedFor.query !== query || searchedFor.filters !== filters) {
    setSearchedFor({ query, filters });
    setPage(1);
    setLoadedThrough(0);
  }

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    // Debounced so rapid changes (typing, dragging the rating slider,
    // clicking through genres quickly) only trigger one network request
    // after things settle, instead of one per keystroke/click.
    const timeoutId = setTimeout(async () => {
      const isFirstPage = page === 1;
      setIsLoading(true);
      setError(null);

      try {
        let newMovies: Movie[];
        let newTotalPages: number;
        let lastFetched = page;

        if (query) {
          let response = await searchMovies(query, page, controller.signal);
          newMovies = applyClientSideFilters(response.results, filters);
          while (
            newMovies.length === 0 &&
            lastFetched < response.totalPages &&
            lastFetched - page + 1 < MAX_SEARCH_PAGES_PER_LOAD
          ) {
            lastFetched += 1;
            response = await searchMovies(query, lastFetched, controller.signal);
            newMovies = applyClientSideFilters(response.results, filters);
          }
          newTotalPages = response.totalPages;
        } else if (hasAnyFilter(filters)) {
          const response = await discoverMovies({ ...filters, page }, controller.signal);
          newMovies = response.results;
          newTotalPages = response.totalPages;
        } else {
          newMovies = [];
          newTotalPages = 1;
        }

        // A newer request has started since this one began, discard
        // this result rather than let it clobber more current data.
        if (requestId !== requestIdRef.current) return;

        setMovies((prev) => (isFirstPage ? newMovies : appendNew(prev, newMovies)));
        setTotalPages(newTotalPages);
        setLoadedThrough(lastFetched);
        setHasSearched(true);
      } catch (err) {
        if (isAbortError(err)) return;
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load movies");
        // Results for a previous search shouldn't stay up as if they matched this one.
        if (isFirstPage) setMovies([]);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, RESULTS_FETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, filters, page, attempt]);

  return {
    movies,
    isLoading,
    hasSearched,
    hasMore: Math.max(page, loadedThrough) < totalPages,
    error,
    loadMore: () => setPage(Math.max(page, loadedThrough) + 1),
    retry: () => setAttempt((n) => n + 1),
  };
}