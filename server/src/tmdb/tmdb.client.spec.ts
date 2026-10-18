import { describe, it, expect, vi, type Mock } from "vitest";
import { HttpError } from "../errors.js";
import { createTmdbClient } from "./tmdb.client.js";
import { catchError, movie, movieDetails, pageOf } from "../../test/fixtures.js";

function setup(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  return { client: createTmdbClient("test-key", fetchMock), fetchMock };
}

// The client always passes a URL object; narrow instead of casting
function requestedUrl(fetchMock: Mock<typeof fetch>): URL {
  const input = fetchMock.mock.calls[0]?.[0];
  if (!(input instanceof URL)) throw new Error("Expected fetch to be called with a URL");
  return input;
}

describe("createTmdbClient", () => {
  describe("discover", () => {
    it("builds the discover URL with api_key and params", async () => {
      const { client, fetchMock } = setup(Response.json(pageOf([movie(1)])));

      await client.discover({ page: "7", "vote_average.gte": "0" });

      const url = requestedUrl(fetchMock);
      expect(`${url.origin}${url.pathname}`).toBe("https://api.themoviedb.org/3/discover/movie");
      expect(url.searchParams.get("api_key")).toBe("test-key");
      expect(url.searchParams.get("page")).toBe("7");
      expect(url.searchParams.get("vote_average.gte")).toBe("0");
      expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), {
        headers: { accept: "application/json" },
      });
    });

    it("returns the validated page", async () => {
      const { client } = setup(Response.json(pageOf([movie(1), movie(2)])));

      await expect(client.discover({})).resolves.toEqual(pageOf([movie(1), movie(2)]));
    });

    it("throws HttpError 502 on a non-OK response", async () => {
      const { client } = setup(Response.json({ status_message: "Unavailable" }, { status: 503 }));

      const err = await catchError(client.discover({}));

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 502, message: "TMDB request failed with status code: 503" });
    });

    it("throws HttpError 502 when fetch rejects", async () => {
      const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
      const client = createTmdbClient("test-key", fetchMock);

      const err = await catchError(client.discover({}));

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 502, message: "TMDB is unreachable" });
    });

    it("throws HttpError 502 when the body has the wrong shape", async () => {
      const { client } = setup(Response.json({ results: "not an array" }));

      const err = await catchError(client.discover({}));

      expect(err).toMatchObject({ status: 502, message: "Unexpected TMDB discover response" });
    });

    it("throws HttpError 502 when the body is not JSON", async () => {
      const { client } = setup(new Response("<html>Bad gateway</html>", { status: 200 }));

      const err = await catchError(client.discover({}));

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 502, message: "TMDB returned invalid JSON" });
    });
  });

  describe("getMovie", () => {
    it("requests /movie/{id} and returns the details", async () => {
      const { client, fetchMock } = setup(Response.json(movieDetails(550)));

      await expect(client.getMovie(550)).resolves.toEqual(movieDetails(550));
      expect(requestedUrl(fetchMock).pathname).toBe("/3/movie/550");
    });

    it("throws HttpError 502 when the body has the wrong shape", async () => {
      const { client } = setup(Response.json({ id: 550 }));

      const err = await catchError(client.getMovie(550));

      expect(err).toMatchObject({ status: 502, message: "Unexpected TMDB movie response" });
    });
  });
});
