import { HttpError } from "../errors.js";
import {
  isTmdbMovieDetails,
  isTmdbPaginated,
  type TmdbMovieDetails,
  type TmdbMovieSummary,
  type TmdbPaginated,
} from "./tmdb.types.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TmdbClient {
  discover(params: Record<string, string>): Promise<TmdbPaginated<TmdbMovieSummary>>;
  getMovie(id: number): Promise<TmdbMovieDetails>;
}

export function createTmdbClient(apiKey: string, fetchImpl: typeof fetch = fetch): TmdbClient {
  async function get(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    url.searchParams.set("api_key", apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let res: Response;
    try {
      res = await fetchImpl(url, { headers: { accept: "application/json" } });
    } catch {
      throw new HttpError(502, "TMDB is unreachable");
    }

    if (!res.ok) {
      throw new HttpError(502, `TMDB request failed with status code: ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      throw new HttpError(502, "TMDB returned invalid JSON");
    }
  }

  return {
    async discover(params) {
      const data = await get("/discover/movie", params);
      if (!isTmdbPaginated(data)) throw new HttpError(502, "Unexpected TMDB discover response");
      return data;
    },
    async getMovie(id) {
      const data = await get(`/movie/${id}`);
      if (!isTmdbMovieDetails(data)) throw new HttpError(502, "Unexpected TMDB movie response");
      return data;
    },
  };
}
