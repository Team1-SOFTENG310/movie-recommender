import type { TmdbPage, TmdbReview } from "../types/tmdb";
import { tmdbGet } from "./tmdb";

/**
 * User reviews TMDB holds for a movie (first page only).
 * Throws on network/HTTP errors — callers should catch and surface a friendly message.
 */
export async function fetchMovieReviews(
  movieId: number,
  signal?: AbortSignal,
): Promise<TmdbReview[]> {
  const data = await tmdbGet<Partial<TmdbPage<TmdbReview>>>(
    `/movie/${movieId}/reviews`,
    {
      signal,
      failureMessage: (status) => `Reviews failed with status ${status}`,
    },
  );

  return data.results ?? [];
}
