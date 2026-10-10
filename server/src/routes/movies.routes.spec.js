import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./movies.routes.js";

const app = express();
app.use(express.json());
app.use("/api/movies", router);

describe("api/random route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get request on /api/random returns a json entry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
            results: [{ name: "this" }],
        }),
        }
    );

    const res = await request(app).get("/api/movies/random/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({name: "this"});
  });

  it("returns 500 on tmdb error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ error: "Service Unavailable" }, { status: 503 })
    );

    const res = await request(app).get("/api/movies/random/");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({message:"TMDB request failed with status code: 503"});
  });

  it("gracefully addresses the fetch call being thrown", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network Error."));

    const res = await request(app).get("/api/movies/random/");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({message:"Network Error."});
  });
});