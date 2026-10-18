import type { TmdbMovieDetails } from "../types/tmdb";
import { tmdbGet } from "./tmdb";

/**
 * Full details for one movie, including its cast.
 * Throws "Movie not found" for any non-2xx response; the detail page shows
 * its 404 view for that message.
 */
export async function fetchMovieDetails(
  movieId: string | number,
  signal?: AbortSignal,
): Promise<TmdbMovieDetails> {
  return tmdbGet<TmdbMovieDetails>(`/movie/${movieId}`, {
    params: { append_to_response: "credits" },
    signal,
    failureMessage: () => "Movie not found",
  });
}
