import type { SearchMoviesResponse } from "../types/movie";
import type { TmdbMovieResult, TmdbPage } from "../types/tmdb";
import { normalizeMovie, tmdbGet } from "./tmdb";

export type SortOption = "rating" | "release_date" | "popularity";

export interface DiscoverFilters {
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  ratingMin?: number;
  // TMDB person ID, not a name. See searchPerson.ts, which resolves a
  // typed actor name to this ID before it ever reaches discoverMovies.
  castId?: number;
  sort?: SortOption;
  page?: number;
}

// Maps our UI-friendly sort names to the exact string TMDB's API expects.
const SORT_MAP: Record<SortOption, string> = {
  rating: "vote_average.desc",
  release_date: "primary_release_date.desc",
  popularity: "popularity.desc",
};

/** Narrows an untrusted value (e.g. a <select> value or stored JSON) to a SortOption. */
export function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && Object.hasOwn(SORT_MAP, value);
}

export async function discoverMovies(
  filters: DiscoverFilters,
  signal?: AbortSignal,
): Promise<SearchMoviesResponse> {
  const params: Record<string, string> = {
    include_adult: "false",
    sort_by: SORT_MAP[filters.sort ?? "popularity"],
  };

  // Each filter is only added if set, so an empty FilterPanel produces an
  // unfiltered "popular movies" query rather than an impossible one.
  if (filters.genre) {params.with_genres = String(filters.genre)};
  // TMDB has no "year range" param, so a from/to range is built as two
  // separate date-boundary filters spanning Jan 1 to Dec 31 of each year.
  if (filters.yearFrom) {params["primary_release_date.gte"] = `${filters.yearFrom}-01-01`};
  if (filters.yearTo) {params["primary_release_date.lte"] = `${filters.yearTo}-12-31`};
  if (filters.language) {params["with_original_language"] = filters.language};
  if (filters.ratingMin) {params["vote_average.gte"] = String(filters.ratingMin)};
  if (filters.castId) {params.with_cast = String(filters.castId)};
  if (filters.page) {params.page = String(filters.page)};

  const data = await tmdbGet<TmdbPage<TmdbMovieResult>>("/discover/movie", {
    params,
    signal,
    failureMessage: (status) => `Discover failed with status ${status}`,
  });

  return {
    results: data.results.map(normalizeMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}
