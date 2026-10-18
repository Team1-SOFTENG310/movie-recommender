import type { TmdbPage, TmdbPersonResult } from "../types/tmdb";
import { getTmdbApiKey, tmdbGet, tmdbImageUrl } from "./tmdb";

export interface Person {
  id: number;
  name: string;
  profileUrl: string | null;
  knownFor: string | null;
}

function normalizePerson(raw: TmdbPersonResult): Person {
  return {
    id: raw.id,
    name: raw.name,
    profileUrl: tmdbImageUrl("w185", raw.profile_path),
    knownFor: raw.known_for_department,
  };
}

/**
 * Resolves a free-text actor name to a TMDB person ID + profile info.
 * Needed because discoverMovies' `castId` filter requires a numeric TMDB
 * person ID, not a name. FilterPanel calls this to look up candidates
 * as the user types, then passes the chosen person's id onward.
 */
export async function searchPerson(query: string, signal?: AbortSignal): Promise<Person[]> {
  // Fail fast on a missing key, even for a blank query.
  getTmdbApiKey();

  // Avoid firing a request (and burning TMDB's rate limit) for an empty
  // or whitespace-only query. The caller debounces, but this is a
  // second guard in case searchPerson is ever called directly.
  if (!query.trim()) return [];

  const data = await tmdbGet<TmdbPage<TmdbPersonResult>>("/search/person", {
    params: { query, include_adult: "false" },
    signal,
    failureMessage: (status) => `Person search failed with status ${status}`,
  });

  // TMDB doesn't sort person search results by relevance in a way that
  // reliably surfaces the famous match first (e.g. searching "Chris"
  // could return an obscure crew member ahead of Chris Evans), so we
  // re-sort by popularity before returning suggestions to the UI.
  const sortedByPopularity = [...data.results].sort((a, b) => b.popularity - a.popularity);
  return sortedByPopularity.map(normalizePerson);
}
