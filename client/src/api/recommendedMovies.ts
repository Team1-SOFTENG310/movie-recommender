import type { Movie } from "../types/movie";
import type { TmdbMovieResult, TmdbPage } from "../types/tmdb";
import { normalizeMovie, tmdbGet } from "./tmdb";

/**
 * Movies the API considers related to `movieId` — the edges of the movie graph.
 * Throws on network/HTTP errors — callers should catch and surface a friendly message.
 */
export async function fetchRecommendedMovies(
  movieId: number,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await tmdbGet<Partial<TmdbPage<TmdbMovieResult>>>(
    `/movie/${movieId}/recommendations`,
    {
      signal,
      failureMessage: (status) => `Recommendations failed with status ${status}`,
    },
  );

  return (data.results ?? []).map(normalizeMovie);
}
