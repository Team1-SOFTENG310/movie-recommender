import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createTmdbClient, type TmdbClient } from "../../src/tmdb/tmdb.client.js";
import { fakeTmdb, movie, pageOf, testConfig } from "../fixtures.js";

const appWith = (tmdb: TmdbClient = fakeTmdb()) => createApp(testConfig, { tmdb });

describe("app (integration)", () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    // errorHandler logs 5xx errors; silence them here and assert on the spy instead
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("GET /api/health", () => {
    it("returns 200 { status: 'ok' }", async () => {
      const res = await request(appWith()).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /api/movies/random", () => {
    it("returns a movie", async () => {
      const tmdb = fakeTmdb();
      tmdb.discover.mockResolvedValue(pageOf([movie(1)]));

      const res = await request(appWith(tmdb)).get("/api/movies/random");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(movie(1));
    });

    it("returns 404 when TMDB has no results", async () => {
      const tmdb = fakeTmdb();
      tmdb.discover.mockResolvedValue(pageOf([]));

      const res = await request(appWith(tmdb)).get("/api/movies/random");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "No movies found" });
    });

    it("returns 502 when TMDB responds with an error", async () => {
      // Real client + fake fetch: exercises client → controller → errorHandler
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ status_message: "Unavailable" }, { status: 503 }));
      const app = appWith(createTmdbClient(testConfig.tmdbApiKey, fetchMock));

      const res = await request(app).get("/api/movies/random");

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ message: "TMDB request failed with status code: 503" });
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns a generic 500 and hides the message for unexpected errors", async () => {
      const tmdb = fakeTmdb();
      tmdb.discover.mockRejectedValue(new Error("secret internal detail"));

      const res = await request(appWith(tmdb)).get("/api/movies/random");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: "Internal server error" });
    });
  });

  describe("errors", () => {
    it("returns 404 JSON for unknown routes", async () => {
      const res = await request(appWith()).get("/api/does-not-exist");

      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ message: "Not found" });
    });

    it("returns 400 JSON for a malformed JSON body", async () => {
      // express.json() runs before routing, so any path reaches errorHandler
      const res = await request(appWith())
        .post("/api/movies/random")
        .set("Content-Type", "application/json")
        .send("{bad json");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Malformed JSON body" });
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe("headers", () => {
    it("sets Access-Control-Allow-Origin to the configured origin", async () => {
      const res = await request(appWith())
        .get("/api/health")
        .set("Origin", testConfig.frontendOrigin);

      expect(res.headers["access-control-allow-origin"]).toBe(testConfig.frontendOrigin);
    });

    it("answers CORS preflight requests", async () => {
      const res = await request(appWith())
        .options("/api/movies/random")
        .set("Origin", testConfig.frontendOrigin)
        .set("Access-Control-Request-Method", "GET");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe(testConfig.frontendOrigin);
    });

    it("does not send X-Powered-By", async () => {
      const res = await request(appWith()).get("/api/health");

      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });
});
