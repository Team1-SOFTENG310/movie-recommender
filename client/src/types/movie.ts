// Shared Movie interface — coordination contract across all components.
// If you need to change this, check with the team first (Person 3/4 depend on it too).

export interface Movie {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
  genreIds: number[];
  voteAverage: number | null;
  /** ISO 639-1 code, e.g. "en". Optional so existing Movie objects stay valid. */
  originalLanguage?: string | null;
}

export interface SearchMoviesResponse {
  results: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
}
