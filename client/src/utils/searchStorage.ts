import { isSortOption, type DiscoverFilters } from "../api/discoverMovies";

// The search page keeps its query and filters in sessionStorage so they
// survive navigating to a movie's detail page and back. Stored values are
// treated as untrusted: anything malformed is dropped rather than trusted.

export const SEARCH_QUERY_STORAGE_KEY = "movieSearchQuery";
export const SEARCH_FILTERS_STORAGE_KEY = "movieSearchFilters";

// Queries containing angle brackets are never stored or restored.
const SAFE_QUERY_PATTERN = /^[^<>]*$/;

const NUMERIC_FILTER_KEYS = ["genre", "yearFrom", "yearTo", "ratingMin", "castId"] as const;

function parseJson(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSafeQuery(query: string): boolean {
  return SAFE_QUERY_PATTERN.test(query);
}

/** Reads the saved search query, or "" if there is none or it is invalid. */
export function readStoredQuery(storage: Storage = sessionStorage): string {
  const parsed = parseJson(storage.getItem(SEARCH_QUERY_STORAGE_KEY));
  return typeof parsed === "string" && isSafeQuery(parsed) ? parsed : "";
}

export function writeStoredQuery(query: string, storage: Storage = sessionStorage): void {
  if (isSafeQuery(query)) {
    storage.setItem(SEARCH_QUERY_STORAGE_KEY, JSON.stringify(query));
  }
}

/** Reads the saved filters, keeping only fields that have the right type. */
export function readStoredFilters(storage: Storage = sessionStorage): DiscoverFilters {
  const parsed = parseJson(storage.getItem(SEARCH_FILTERS_STORAGE_KEY));
  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  // Safe widening: every field read from it is still `unknown` and checked below.
  const stored = parsed as Record<string, unknown>;
  const filters: DiscoverFilters = {};

  for (const key of NUMERIC_FILTER_KEYS) {
    const value = stored[key];
    if (typeof value === "number") {
      filters[key] = value;
    }
  }

  if (isSortOption(stored.sort)) {
    filters.sort = stored.sort;
  }

  return filters;
}

export function writeStoredFilters(filters: DiscoverFilters, storage: Storage = sessionStorage): void {
  storage.setItem(SEARCH_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}
