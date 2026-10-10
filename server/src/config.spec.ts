import { describe, it, expect, vi } from "vitest";
import { loadConfig } from "./config.js";

const withKey = { TMDB_API_KEY: "tmdb-key" };

describe("loadConfig", () => {
  describe("ports", () => {
    it("defaults to 5000 and 5173", () => {
      // toEqual ignores undefined properties, so the optional keys don't need listing
      expect(loadConfig(withKey)).toEqual({
        port: 5000,
        frontendOrigin: "http://localhost:5173",
        tmdbApiKey: "tmdb-key",
      });
    });

    it("reads BACKEND_PORT and VITE_FRONTEND_PORT", () => {
      const config = loadConfig({ ...withKey, BACKEND_PORT: "8080", VITE_FRONTEND_PORT: "3000" });

      expect(config.port).toBe(8080);
      expect(config.frontendOrigin).toBe("http://localhost:3000");
    });

    it("treats an empty port as unset", () => {
      expect(loadConfig({ ...withKey, BACKEND_PORT: "" }).port).toBe(5000);
    });

    it.each(["abc", "0", "-1", "50.5", "65536"])("rejects BACKEND_PORT=%s", (value) => {
      expect(() => loadConfig({ ...withKey, BACKEND_PORT: value })).toThrow(
        /BACKEND_PORT must be a valid port number/,
      );
    });

    it("rejects an invalid VITE_FRONTEND_PORT", () => {
      expect(() => loadConfig({ ...withKey, VITE_FRONTEND_PORT: "abc" })).toThrow(
        /VITE_FRONTEND_PORT must be a valid port number/,
      );
    });
  });

  describe("TMDB API key", () => {
    it("throws when no key is set", () => {
      expect(() => loadConfig({})).toThrow(/Missing TMDB API key/);
    });

    it("throws when the key is only whitespace", () => {
      expect(() => loadConfig({ TMDB_API_KEY: "   " })).toThrow(/Missing TMDB API key/);
    });

    it("falls back to VITE_TMDB_API_KEY", () => {
      expect(loadConfig({ VITE_TMDB_API_KEY: "vite-key" }).tmdbApiKey).toBe("vite-key");
    });

    it("prefers TMDB_API_KEY over VITE_TMDB_API_KEY", () => {
      const config = loadConfig({ TMDB_API_KEY: "server-key", VITE_TMDB_API_KEY: "vite-key" });
      expect(config.tmdbApiKey).toBe("server-key");
    });

    it("falls back to VITE_TMDB_API_KEY when TMDB_API_KEY is empty", () => {
      const config = loadConfig({ TMDB_API_KEY: "", VITE_TMDB_API_KEY: "vite-key" });
      expect(config.tmdbApiKey).toBe("vite-key");
    });
  });

  it("passes optional keys through", () => {
    const config = loadConfig({ ...withKey, MONGODB_URI: "mongodb://x", JWT_SECRET: "s", LLM_API_KEY: "l" });

    expect(config).toMatchObject({ mongoUri: "mongodb://x", jwtSecret: "s", llmApiKey: "l" });
  });

  it("reads process.env by default", () => {
    vi.stubEnv("TMDB_API_KEY", "from-process"); // undone automatically by unstubEnvs: true

    expect(loadConfig().tmdbApiKey).toBe("from-process");
  });
});
