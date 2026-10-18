import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { HttpError } from "../errors.js";
import { asyncHandler, errorHandler, notFound } from "./error.middleware.js";

// One route at /test in front of the real notFound + errorHandler
function appWith(handler: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.all("/test", handler);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const failWith = (err: unknown): RequestHandler => (_req, _res, next) => next(err);
const ok: RequestHandler = (_req, res) => {
  res.json({ ok: true });
};

describe("error middleware", () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("errorHandler", () => {
    it("uses HttpError's status and message", async () => {
      const res = await request(appWith(failWith(new HttpError(409, "Already exists")))).get("/test");

      expect(res.status).toBe(409);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ message: "Already exists" });
    });

    it("does not log 4xx errors", async () => {
      await request(appWith(failWith(new HttpError(404, "Missing")))).get("/test");

      expect(consoleError).not.toHaveBeenCalled();
    });

    it("logs 5xx HttpErrors", async () => {
      const err = new HttpError(502, "Upstream failed");

      await request(appWith(failWith(err))).get("/test");

      expect(consoleError).toHaveBeenCalledWith(err);
    });

    it("returns a generic 500 for plain Errors and logs them", async () => {
      const err = new Error("secret internal detail");

      const res = await request(appWith(failWith(err))).get("/test");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: "Internal server error" });
      expect(consoleError).toHaveBeenCalledWith(err);
    });

    it("returns 500 for non-Error values", async () => {
      const res = await request(appWith(failWith("a string"))).get("/test");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: "Internal server error" });
    });

    it("maps body-parser syntax errors to 400", async () => {
      const res = await request(appWith(ok))
        .post("/test")
        .set("Content-Type", "application/json")
        .send("{bad json");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Malformed JSON body" });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("does not treat other SyntaxErrors as bad requests", async () => {
      const res = await request(appWith(failWith(new SyntaxError("Unexpected token")))).get("/test");

      expect(res.status).toBe(500);
    });
  });

  describe("asyncHandler", () => {
    it("forwards a rejected promise to the error handler", async () => {
      const handler: RequestHandler = asyncHandler(async () => {
        throw new HttpError(418, "I'm a teapot");
      });

      const res = await request(appWith(handler)).get("/test");

      expect(res.status).toBe(418);
      expect(res.body).toEqual({ message: "I'm a teapot" });
    });

    it("lets a resolved handler respond normally", async () => {
      const handler: RequestHandler = asyncHandler(async (_req, res) => {
        res.json({ ok: true });
      });

      const res = await request(appWith(handler)).get("/test");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe("notFound", () => {
    it("returns 404 JSON for unmatched routes", async () => {
      const res = await request(appWith(ok)).get("/missing");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });
});
