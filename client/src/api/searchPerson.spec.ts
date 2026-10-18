import { describe, it, expect, vi } from "vitest";
import { searchPerson } from "./searchPerson";

describe("searchPerson", () => {
  it("returns people sorted by popularity, normalized", async () => {
    const results = await searchPerson("Test");

    expect(results).toEqual([
      // higher popularity (15.5) sorts first
      {
        id: 999,
        name: "Test Actor",
        profileUrl: "https://image.tmdb.org/t/p/w185/actor.jpg",
        knownFor: "Acting",
      },
      // no profile_path provided
      { id: 998, name: "Test Actor Two", profileUrl: null, knownFor: "Acting" },
    ]);
  });

  it("returns an empty array for a blank query without calling the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const results = await searchPerson("   ");

    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
