import type { SearchMoviesResponse } from "../types/movie";
import type { TmdbMovieResult, TmdbPage } from "../types/tmdb";
import { normalizeMovie, tmdbGet } from "./tmdb";

/**
 * Search movies by title (query-by-title endpoint).
 * Throws on network/HTTP errors — callers should catch and surface a friendly message.
 */
export async function searchMovies(
  query: string,
  page: number = 1,
  signal?: AbortSignal,
): Promise<SearchMoviesResponse> {
  const data = await tmdbGet<TmdbPage<TmdbMovieResult>>("/search/movie", {
    params: {
      query,
      page: String(page),
      include_adult: "false",
    },
    signal,
    failureMessage: (status) => `Search failed with status ${status}`,
  });

  return {
    results: data.results.map(normalizeMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}
