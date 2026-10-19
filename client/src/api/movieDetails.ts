import type { TmdbMovieDetails } from "../types/tmdb";
import { tmdbGet, tmdbImageUrl } from "./tmdb";

export const MOVIE_NOT_FOUND = "Movie not found";

/**
 * Full details for one movie, including its cast.
 * Throws MOVIE_NOT_FOUND for a 404 (the detail page shows its 404 view for it)
 * and a general message for any other failed response.
 */
export async function fetchMovieDetails(
  movieId: string | number,
  signal?: AbortSignal,
): Promise<TmdbMovieDetails> {
  return tmdbGet<TmdbMovieDetails>(`/movie/${movieId}`, {
    params: { append_to_response: "credits" },
    signal,
    failureMessage: (status) =>
      status === 404 ? MOVIE_NOT_FOUND : "Couldn't load this movie. Please try again.",
  });
}

/** Just enough about a movie to list it, e.g. in the viewing history. */
export interface MovieSummary {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
}

/** A movie's title, year and poster, without the cast that fetchMovieDetails adds. */
export async function fetchMovieSummary(
  movieId: number,
  signal?: AbortSignal,
): Promise<MovieSummary> {
  const movie = await tmdbGet<TmdbMovieDetails>(`/movie/${movieId}`, {
    signal,
    failureMessage: (status) => `Movie ${movieId} failed with status ${status}`,
  });
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    posterUrl: tmdbImageUrl("w342", movie.poster_path),
  };
}
