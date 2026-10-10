// Raw TMDB shapes (snake_case), mirroring client/src/api/discoverMovies.ts
export interface TmdbMovieSummary {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[] | null;
  vote_average: number | null;
}

export interface TmdbPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

// /movie/{id} returns full genre objects instead of genre_ids
export interface TmdbMovieDetails extends Omit<TmdbMovieSummary, "genre_ids"> {
  genres: TmdbGenre[];
  runtime: number | null;
  imdb_id: string | null;
  tagline: string | null;
  status: string;
  vote_count: number;
  original_language: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isTmdbMovieSummary(x: unknown): x is TmdbMovieSummary {
  return isRecord(x) && typeof x.id === "number" && typeof x.title === "string";
}

export function isTmdbPaginated(x: unknown): x is TmdbPaginated<TmdbMovieSummary> {
  return (
    isRecord(x) &&
    typeof x.page === "number" &&
    typeof x.total_pages === "number" &&
    typeof x.total_results === "number" &&
    Array.isArray(x.results) &&
    x.results.every(isTmdbMovieSummary)
  );
}

export function isTmdbMovieDetails(x: unknown): x is TmdbMovieDetails {
  return (
    isRecord(x) &&
    typeof x.id === "number" &&
    typeof x.title === "string" &&
    Array.isArray(x.genres)
  );
}
