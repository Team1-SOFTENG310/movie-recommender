// Shared test data and fakes; not a spec file, so Vitest doesn't run it
import { vi } from "vitest";
import type { AppConfig } from "../src/config.js";
import type { TmdbClient } from "../src/tmdb/tmdb.client.js";
import type { TmdbMovieDetails, TmdbMovieSummary, TmdbPaginated } from "../src/tmdb/tmdb.types.js";

export const testConfig: AppConfig = {
  port: 0,
  frontendOrigin: "http://localhost:5173",
  tmdbApiKey: "test-key",
};

export const movie = (id: number): TmdbMovieSummary => ({
  id,
  title: `Movie ${id}`,
  release_date: null,
  poster_path: null,
  overview: null,
  genre_ids: [],
  vote_average: null,
});

export const movieDetails = (id: number): TmdbMovieDetails => ({
  id,
  title: `Movie ${id}`,
  release_date: null,
  poster_path: null,
  overview: null,
  vote_average: null,
  genres: [{ id: 18, name: "Drama" }],
  runtime: 120,
  imdb_id: null,
  tagline: null,
  status: "Released",
  vote_count: 0,
  original_language: "en",
});

export const pageOf = (results: TmdbMovieSummary[]): TmdbPaginated<TmdbMovieSummary> => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

// `satisfies` keeps the Mock types, so tests can call tmdb.discover.mockResolvedValue(...)
export function fakeTmdb() {
  return {
    discover: vi.fn<TmdbClient["discover"]>(),
    getMovie: vi.fn<TmdbClient["getMovie"]>(),
  } satisfies TmdbClient;
}

// Returns what a promise rejected with, so tests can check status and message without a cast
export async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("Expected promise to reject");
}
