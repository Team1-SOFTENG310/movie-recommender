import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import type { TmdbMovieSummary } from "../tmdb/tmdb.types.js";
import { fakeTmdb, movie, pageOf, testConfig } from "../../test/fixtures.js";

// Typed with the (min, max) => number overload; vi.mocked(randomInt) would pick
// the callback overload (returns void) and reject mockReturnValue(number)
const randomIntMock = vi.hoisted(() => vi.fn<(min: number, max: number) => number>());

vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomInt: randomIntMock,
}));

function setup(results: TmdbMovieSummary[]) {
  const tmdb = fakeTmdb();
  tmdb.discover.mockResolvedValue(pageOf(results));
  return { app: createApp(testConfig, { tmdb }), discover: tmdb.discover };
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
