// Raw response shapes from the TMDB API, in TMDB's own snake_case.
// Fields TMDB can return as null (or leave out) are typed that way, so the
// compiler makes callers handle them. Components that show movies in lists
// use the normalised Movie type (types/movie.ts) instead of these.

/** A paginated list endpoint, e.g. /search/movie or /movie/{id}/recommendations. */
export interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** A movie as it appears in TMDB list results. */
export interface TmdbMovieResult {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[] | null;
  vote_average: number | null;
}

export interface TmdbPersonResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  popularity: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

/** /movie/{id} with `append_to_response=credits`. */
export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  runtime: number | null;
  vote_average: number | null;
  genres: TmdbGenre[];
  credits?: { cast: TmdbCastMember[] };
}

export interface TmdbReview {
  id: string;
  author: string;
  content: string;
  author_details: { rating: number | null };
}
