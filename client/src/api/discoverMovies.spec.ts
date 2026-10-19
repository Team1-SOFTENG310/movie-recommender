import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { discoverMovies } from "./discoverMovies";

/** Runs discoverMovies and returns the query string it sent to TMDB. */
async function sentParams(filters: Parameters<typeof discoverMovies>[0]): Promise<URLSearchParams> {
  let params = new URLSearchParams();
  server.use(
    http.get("https://api.themoviedb.org/3/discover/movie", ({ request }) => {
      params = new URL(request.url).searchParams;
      return HttpResponse.json({ results: [], page: 1, total_pages: 1, total_results: 0 });
    }),
  );
  await discoverMovies(filters);
  return params;
}

describe("discoverMovies", () => {
  it("returns normalized results from the discover endpoint", async () => {
    const response = await discoverMovies({ genre: 28, sort: "popularity" });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      id: 654321,
      title: "TestDiscoverMovie",
      year: 2015,
      voteAverage: 8.2,
      genreIds: [28],
    });
  });

  it("throws when the API key is missing", async () => {
    vi.stubEnv("VITE_TMDB_API_KEY", "");
    await expect(discoverMovies({})).rejects.toThrow(/Missing VITE_TMDB_API_KEY/);
    vi.stubEnv("VITE_TMDB_API_KEY", "test-key");
  });

  it("adds no vote floor to a plain popularity browse", async () => {
    const params = await sentParams({ sort: "popularity" });

    expect(params.get("sort_by")).toBe("popularity.desc");
    expect(params.has("vote_count.gte")).toBe(false);
  });

  it("ignores films with only a handful of votes when sorting by rating", async () => {
    const params = await sentParams({ sort: "rating" });

    expect(params.get("sort_by")).toBe("vote_average.desc");
    expect(params.get("vote_count.gte")).toBe("200");
  });

  it("needs some votes behind a minimum rating", async () => {
    const params = await sentParams({ ratingMin: 7 });

    expect(params.get("vote_average.gte")).toBe("7");
    expect(params.get("vote_count.gte")).toBe("50");
  });

  it("starts the newest-first sort from today rather than unreleased films", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));

    const params = await sentParams({ sort: "release_date", yearFrom: 1900, yearTo: 2026 });

    vi.useRealTimers();
    expect(params.get("primary_release_date.lte")).toBe("2026-10-18");
    expect(params.get("vote_count.gte")).toBe("10");
  });

  it("keeps an earlier end year when sorting by release date", async () => {
    const params = await sentParams({ sort: "release_date", yearTo: 1999 });

    expect(params.get("primary_release_date.lte")).toBe("1999-12-31");
  });
});
