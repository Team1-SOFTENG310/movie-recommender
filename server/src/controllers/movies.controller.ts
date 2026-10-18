// src/controllers/movies.controller.ts
import { randomInt } from "node:crypto";
import type { RequestHandler } from "express";
import { HttpError, type ErrorResponse } from "../errors.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import type { TmdbClient } from "../tmdb/tmdb.client.js";
import type { TmdbMovieSummary } from "../tmdb/tmdb.types.js";

const TMDB_PAGE_MAX = 500; // TMDB rejects discover pages above 500

export interface MoviesDeps {
  tmdb: TmdbClient;
}

export function createMoviesController({ tmdb }: MoviesDeps) {
  const getRandomMovie: RequestHandler<{}, TmdbMovieSummary | ErrorResponse> = asyncHandler(
    async (_req, res) => {
      const page = await tmdb.discover({
        page: String(randomInt(1, TMDB_PAGE_MAX)),
        "vote_average.gte": "0",
      });

      // Check before randomInt: randomInt(0, 0) throws a RangeError
      if (page.results.length === 0) throw new HttpError(404, "No movies found");

      const movie = page.results[randomInt(0, page.results.length)];
      if (!movie) throw new HttpError(404, "No movies found");
      res.json(movie);
    },
  );

  return { getRandomMovie };
}
