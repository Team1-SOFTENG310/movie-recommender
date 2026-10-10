// src/routes/movies.routes.spec.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config.js";
import { HttpError } from "../errors.js";
import type { TmdbClient } from "../tmdb/tmdb.client.js";
import type { TmdbMovieSummary, TmdbPaginated } from "../tmdb/tmdb.types.js";

const config: AppConfig = { port: 0, frontendOrigin: "http://localhost:5173", tmdbApiKey: "test" };

const movie = (id: number): TmdbMovieSummary => ({
  id, title: `Movie ${id}`, release_date: null, poster_path: null,
  overview: null, genre_ids: [], vote_average: null,
});

const pageOf = (results: TmdbMovieSummary[]): TmdbPaginated<TmdbMovieSummary> => ({
  page: 1, results, total_pages: 1, total_results: results.length,
});

function appWith(discover: TmdbClient["discover"]) {
  return createApp(config, { tmdb: { discover, getMovie: vi.fn() } });
}

describe("GET /api/movies/random", () => {
  it("returns a movie", async () => {
    const res = await request(appWith(vi.fn().mockResolvedValue(pageOf([movie(1)])))).get("/api/movies/random");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(movie(1));
  });

  it("returns 404 when TMDB has no results", async () => {
    const res = await request(appWith(vi.fn().mockResolvedValue(pageOf([])))).get("/api/movies/random");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No movies found" });
  });

  it("passes TMDB errors through the error handler", async () => {
    const discover = vi.fn().mockRejectedValue(new HttpError(502, "TMDB request failed with status code: 503"));
    const res = await request(appWith(discover)).get("/api/movies/random");
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: "TMDB request failed with status code: 503" });
  });

  it("hides unexpected error messages", async () => {
    const res = await request(appWith(vi.fn().mockRejectedValue(new Error("boom")))).get("/api/movies/random");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});
