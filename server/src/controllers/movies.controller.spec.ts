import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import type { AppConfig } from "../config.js";
import type { TmdbClient } from "../tmdb/tmdb.client.js";
import type { TmdbMovieSummary, TmdbPaginated } from "../tmdb/tmdb.types.js";

// Typed with the (min, max) => number overload; vi.mocked(randomInt) would pick
// the callback overload (returns void) and reject mockReturnValue(number)
const randomIntMock = vi.hoisted(() => vi.fn<(min: number, max: number) => number>());

vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomInt: randomIntMock,
}));

const config: AppConfig = { port: 0, frontendOrigin: "http://localhost:5173", tmdbApiKey: "test" };

const movie = (id: number): TmdbMovieSummary => ({
  id,
  title: `Movie ${id}`,
  release_date: null,
  poster_path: null,
  overview: null,
  genre_ids: [],
  vote_average: null,
});

const pageOf = (results: TmdbMovieSummary[]): TmdbPaginated<TmdbMovieSummary> => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

function setup(results: TmdbMovieSummary[]) {
  const discover = vi.fn<TmdbClient["discover"]>().mockResolvedValue(pageOf(results));
  const app = createApp(config, { tmdb: { discover, getMovie: vi.fn<TmdbClient["getMovie"]>() } });
  return { app, discover };
}

describe("getRandomMovie", () => {
  beforeEach(() => {
    // restoreMocks only restores spies, so clear queued return values explicitly
    randomIntMock.mockReset();
  });

  it("requests a random page and returns the randomly indexed result", async () => {
    randomIntMock.mockReturnValueOnce(7).mockReturnValueOnce(1);
    const { app, discover } = setup([movie(1), movie(2), movie(3)]);

    const res = await request(app).get("/api/movies/random");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(movie(2));
    expect(randomIntMock).toHaveBeenNthCalledWith(1, 1, 500);
    expect(randomIntMock).toHaveBeenNthCalledWith(2, 0, 3);
    expect(discover).toHaveBeenCalledWith({ page: "7", "vote_average.gte": "0" });
  });

  it("returns 404 without indexing when the page is empty", async () => {
    randomIntMock.mockReturnValueOnce(7);
    const { app } = setup([]);

    const res = await request(app).get("/api/movies/random");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No movies found" });
    // Only the page pick; randomInt(0, 0) would throw a RangeError
    expect(randomIntMock).toHaveBeenCalledTimes(1);
  });
});
