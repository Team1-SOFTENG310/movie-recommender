import type { Movie } from "../types/movie";
import type { TmdbMovieResult } from "../types/tmdb";

// Shared plumbing for every request the client makes straight to TMDB.

const API_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

/**
 * Full URL for a TMDB image, or null when TMDB has no image for it.
 * `size` is one of TMDB's image widths, e.g. "w342".
 */
export function tmdbImageUrl(size: string, path: string | null): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

export function getTmdbApiKey(): string {
  // Read on every call (not at module scope) so tests can stub
  // VITE_TMDB_API_KEY via vi.stubEnv before a request is made.
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_TMDB_API_KEY (set it in .env as VITE_TMDB_API_KEY=... and restart Vite).",
    );
  }
  return apiKey;
}

interface TmdbGetOptions {
  params?: Record<string, string>;
  signal?: AbortSignal;
  /** Message for the Error thrown when TMDB responds with a non-2xx status. */
  failureMessage: (status: number) => string;
}

/**
 * GETs a TMDB endpoint and returns its JSON body as `T`.
 *
 * The body is not validated at runtime, so `T` must describe what TMDB
 * actually sends (see types/tmdb.ts), including fields that can be null.
 * Throws on network errors, aborts and non-2xx responses.
 */
export async function tmdbGet<T>(
  path: string,
  { params = {}, signal, failureMessage }: TmdbGetOptions,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  url.searchParams.set("api_key", getTmdbApiKey());
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(failureMessage(response.status));
  }

  const body: unknown = await response.json();
  return body as T;
}

/** Converts a TMDB list result into the Movie shape the UI works with. */
export function normalizeMovie(raw: TmdbMovieResult): Movie {
  return {
    id: raw.id,
    title: raw.title,
    year: raw.release_date ? Number(raw.release_date.slice(0, 4)) : null,
    posterUrl: tmdbImageUrl("w342", raw.poster_path),
    overview: raw.overview ?? "",
    genreIds: raw.genre_ids ?? [],
    voteAverage: raw.vote_average ?? null,
  };
}

/** True for the error a fetch rejects with after its AbortSignal fires. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
