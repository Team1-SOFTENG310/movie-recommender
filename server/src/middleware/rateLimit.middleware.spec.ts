import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter } from "./rateLimit.middleware.js";

function appWithLimit(now: () => number) {
  const app = express();
  app.use(createRateLimiter({ windowMs: 60_000, max: 2, message: "Slow down", now }));
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit, then answers 429 with Retry-After", async () => {
    const app = appWithLimit(() => 0);

    expect((await request(app).get("/")).status).toBe(200);
    expect((await request(app).get("/")).status).toBe(200);

    const blocked = await request(app).get("/");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: "Slow down" });
    expect(blocked.headers["retry-after"]).toBe("60");
  });

  it("starts a fresh allowance once the window has passed", async () => {
    let time = 0;
    const app = appWithLimit(() => time);

    await request(app).get("/");
    await request(app).get("/");
    expect((await request(app).get("/")).status).toBe(429);

    time = 60_000;
    expect((await request(app).get("/")).status).toBe(200);
  });
});
