import { http, HttpResponse } from "msw";
import { describe, it, expect, vi } from "vitest";
import { server } from "../test/server";
import type { TmdbMovieResult } from "../types/tmdb";
import { getTmdbApiKey, isAbortError, normalizeMovie, tmdbGet, tmdbImageUrl } from "./tmdb";

describe("getTmdbApiKey", () => {
  it("returns the configured key", () => {
    expect(getTmdbApiKey()).toBe("test-key");
  });

  it("throws a helpful error when the key is missing", () => {
    vi.stubEnv("VITE_TMDB_API_KEY", "");
    expect(() => getTmdbApiKey()).toThrow(/Missing VITE_TMDB_API_KEY/);
    vi.stubEnv("VITE_TMDB_API_KEY", "test-key");
  });
});

describe("tmdbImageUrl", () => {
  it("builds a full image URL for a path", () => {
    expect(tmdbImageUrl("w342", "/poster.jpg")).toBe("https://image.tmdb.org/t/p/w342/poster.jpg");
  });

  it("returns null when TMDB has no image", () => {
    expect(tmdbImageUrl("w342", null)).toBeNull();
  });
});

describe("normalizeMovie", () => {
  it("converts a TMDB result into a Movie", () => {
    const raw: TmdbMovieResult = {
      id: 1,
      title: "Heat",
      release_date: "1995-12-15",
      poster_path: "/heat.jpg",
      overview: "A heist film.",
      genre_ids: [28, 80],
      vote_average: 7.9,
    };

    expect(normalizeMovie(raw)).toEqual({
      id: 1,
      title: "Heat",
      year: 1995,
      posterUrl: "https://image.tmdb.org/t/p/w342/heat.jpg",
      overview: "A heist film.",
      genreIds: [28, 80],
      voteAverage: 7.9,
    });
  });

  it("fills in safe defaults for fields TMDB leaves null or empty", () => {
    const raw: TmdbMovieResult = {
      id: 2,
      title: "Untitled",
      release_date: "",
      poster_path: null,
      overview: null,
      genre_ids: null,
      vote_average: null,
    };

    expect(normalizeMovie(raw)).toEqual({
      id: 2,
      title: "Untitled",
      year: null,
      posterUrl: null,
      overview: "",
      genreIds: [],
      voteAverage: null,
    });
  });
});

describe("tmdbGet", () => {
  it("sends the API key and params, and returns the JSON body", async () => {
    let requestedUrl: URL | undefined;
    server.use(
      http.get("https://api.themoviedb.org/3/test/endpoint", ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );

    const body = await tmdbGet<{ ok: boolean }>("/test/endpoint", {
      params: { query: "heat" },
      failureMessage: () => "unused",
    });

    expect(body).toEqual({ ok: true });
    expect(requestedUrl?.searchParams.get("api_key")).toBe("test-key");
    expect(requestedUrl?.searchParams.get("query")).toBe("heat");
  });

  it("throws the caller's message for a non-2xx response", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/test/endpoint", () =>
        HttpResponse.json({ status_message: "nope" }, { status: 503 }),
      ),
    );

    await expect(
      tmdbGet("/test/endpoint", { failureMessage: (status) => `Test failed with status ${status}` }),
    ).rejects.toThrow("Test failed with status 503");
  });

  it("rejects with an error isAbortError recognises when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const error: unknown = await tmdbGet("/movie/1", {
      signal: controller.signal,
      failureMessage: () => "unused",
    }).catch((err: unknown) => err);

    expect(isAbortError(error)).toBe(true);
  });
});

describe("isAbortError", () => {
  it("is false for other errors and non-errors", () => {
    expect(isAbortError(new Error("Search failed with status 500"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
