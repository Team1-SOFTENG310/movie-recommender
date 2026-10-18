import { beforeEach, describe, it, expect } from "vitest";
import {
  SEARCH_FILTERS_STORAGE_KEY,
  SEARCH_QUERY_STORAGE_KEY,
  readStoredFilters,
  readStoredQuery,
  writeStoredFilters,
  writeStoredQuery,
} from "./searchStorage";

describe("searchStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("query", () => {
    it("round-trips a saved query", () => {
      writeStoredQuery("Blade Runner");
      expect(readStoredQuery()).toBe("Blade Runner");
    });

    it("returns an empty query when nothing is saved", () => {
      expect(readStoredQuery()).toBe("");
    });

    it("never stores a query containing angle brackets", () => {
      writeStoredQuery("<script>");
      expect(sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY)).toBeNull();
    });

    it.each([
      ["malformed JSON", "{not json"],
      ["a non-string value", "42"],
      ["angle brackets", JSON.stringify("<img src=x>")],
    ])("ignores a saved query with %s", (_case, saved) => {
      sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, saved);
      expect(readStoredQuery()).toBe("");
    });
  });

  describe("filters", () => {
    it("round-trips saved filters", () => {
      const filters = { genre: 28, yearFrom: 1990, yearTo: 2000, ratingMin: 6.5, castId: 999, sort: "rating" as const };
      writeStoredFilters(filters);
      expect(readStoredFilters()).toEqual(filters);
    });

    it("keeps only fields with the right type", () => {
      sessionStorage.setItem(
        SEARCH_FILTERS_STORAGE_KEY,
        JSON.stringify({ genre: "28", yearFrom: 1990, sort: "alphabetical", extra: true }),
      );
      expect(readStoredFilters()).toEqual({ yearFrom: 1990 });
    });

    it.each([
      ["nothing saved", null],
      ["malformed JSON", "{not json"],
      ["null", "null"],
      ["an array", "[1, 2]"],
      ["a string", JSON.stringify("genre")],
    ])("returns no filters for %s", (_case, saved) => {
      if (saved !== null) {
        sessionStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, saved);
      }
      expect(readStoredFilters()).toEqual({});
    });
  });
});
