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
}

function hasAnyFilter(filters: DiscoverFilters): boolean {
  return Boolean(
    filters.genre || filters.yearFrom || filters.yearTo || filters.ratingMin || filters.castId,
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks the most recent request so a slow, stale response (e.g. from
  // a query the user has since changed away from) can't overwrite
  // results from a request that started later but resolved first.
  const requestIdRef = useRef(0);

  // Reset to page 1 whenever the query or filters change, so switching
  // filters mid-scroll doesn't append page-3 results onto a brand new
  // filter set.
  useEffect(() => {
    setPage(1);
  }, [query, filters]);

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

        if (query) {
          const response = await searchMovies(query, page, controller.signal);
          newMovies = applyClientSideFilters(response.results, filters);
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

        setMovies((prev) => (isFirstPage ? newMovies : [...prev, ...newMovies]));
        setTotalPages(newTotalPages);
        setHasSearched(true);
      } catch (err) {
        if (isAbortError(err)) return;
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load movies");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, RESULTS_FETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, filters, page]);

  return {
    movies,
    isLoading,
    hasSearched,
    hasMore: page < totalPages,
    error,
    loadMore: () => setPage((p) => p + 1),
  };
}