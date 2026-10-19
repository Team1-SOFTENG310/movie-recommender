import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { fakeDeps, testConfig } from "../../test/fixtures.js";
import { HISTORY_LIMIT } from "../controllers/history.controller.js";

const mocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userFindById: vi.fn(),
  passwordHash: vi.fn(),
  historyFind: vi.fn(),
  historySort: vi.fn(),
  historyLimit: vi.fn(),
  historyLean: vi.fn(),
  historyUpsert: vi.fn(),
  historyDeleteMany: vi.fn(),
}));

vi.mock("../models/User.js", () => ({
  User: { create: mocks.userCreate, findById: mocks.userFindById, findOne: vi.fn() },
}));

vi.mock("../models/ViewingHistory.js", () => ({
  ViewingHistory: {
    find: mocks.historyFind,
    findOneAndUpdate: mocks.historyUpsert,
    deleteMany: mocks.historyDeleteMany,
  },
}));

vi.mock("bcryptjs", () => ({ default: { hash: mocks.passwordHash, compare: vi.fn() } }));

let databaseReady = true;
const app = createApp(testConfig, fakeDeps({ isDatabaseReady: () => databaseReady }));

const account = { _id: "user-123", username: "film_fan", email: "film@example.com" };

/** An agent holding a logged-in session cookie, created through the real sign-up route. */
async function loggedInAgent() {
  mocks.passwordHash.mockResolvedValue("hash");
  mocks.userCreate.mockResolvedValue(account);
  const agent = request.agent(app);
  await agent
    .post("/api/auth/signup")
    .send({ username: "film_fan", email: "film@example.com", password: "long-password" })
    .expect(201);
  return agent;
}

describe("users routes", () => {
  beforeEach(() => {
    databaseReady = true;
    vi.clearAllMocks();
    // find().sort().limit().lean() chain
    mocks.historyFind.mockReturnValue({ sort: mocks.historySort });
    mocks.historySort.mockReturnValue({ limit: mocks.historyLimit });
    mocks.historyLimit.mockReturnValue({ lean: mocks.historyLean });
  });

  describe("GET /api/users/me", () => {
    it("returns the logged-in user", async () => {
      const agent = await loggedInAgent();
      mocks.userFindById.mockResolvedValue(account);

      const res = await agent.get("/api/users/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { id: "user-123", username: "film_fan", email: "film@example.com" } });
    });

    it("returns 401 without a session", async () => {
      const res = await request(app).get("/api/users/me");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users/me/history", () => {
    it("lists the user's recent movies, newest first", async () => {
      const agent = await loggedInAgent();
      mocks.historyLean.mockResolvedValue([
        { movieId: 27205, lastViewedAt: new Date("2026-10-19T10:00:00Z") },
        { movieId: 603, lastViewedAt: new Date("2026-10-18T09:00:00Z") },
      ]);

      const res = await agent.get("/api/users/me/history");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        history: [
          { movieId: 27205, viewedAt: "2026-10-19T10:00:00.000Z" },
          { movieId: 603, viewedAt: "2026-10-18T09:00:00.000Z" },
        ],
      });
      expect(mocks.historyFind).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mocks.historySort).toHaveBeenCalledWith({ lastViewedAt: -1 });
      expect(mocks.historyLimit).toHaveBeenCalledWith(HISTORY_LIMIT);
    });

    it("requires a logged-in user", async () => {
      const res = await request(app).get("/api/users/me/history");

      expect(res.status).toBe(401);
      expect(mocks.historyFind).not.toHaveBeenCalled();
    });

    it("returns 503 while MongoDB is unavailable", async () => {
      const agent = await loggedInAgent();
      databaseReady = false;

      const res = await agent.get("/api/users/me/history");

      expect(res.status).toBe(503);
    });
  });

  describe("POST /api/users/me/history", () => {
    it("records a viewed movie for the logged-in user", async () => {
      const agent = await loggedInAgent();
      mocks.historyUpsert.mockReturnValue({
        lean: () => Promise.resolve({ movieId: 603, lastViewedAt: new Date("2026-10-19T10:00:00Z") }),
      });

      const res = await agent.post("/api/users/me/history").send({ movieId: 603 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ movieId: 603, viewedAt: "2026-10-19T10:00:00.000Z" });
      expect(mocks.historyUpsert).toHaveBeenCalledWith(
        { userId: "user-123", movieId: 603 },
        { lastViewedAt: expect.any(Date) },
        expect.objectContaining({ upsert: true }),
      );
    });

    it.each([
      ["missing", {}],
      ["a string", { movieId: "603" }],
      ["zero", { movieId: 0 }],
      ["negative", { movieId: -4 }],
      ["a fraction", { movieId: 1.5 }],
    ])("rejects a movieId that is %s", async (_case, body) => {
      const agent = await loggedInAgent();

      const res = await agent.post("/api/users/me/history").send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "movieId must be a positive integer" });
      expect(mocks.historyUpsert).not.toHaveBeenCalled();
    });

    it("requires a logged-in user", async () => {
      const res = await request(app).post("/api/users/me/history").send({ movieId: 603 });

      expect(res.status).toBe(401);
      expect(mocks.historyUpsert).not.toHaveBeenCalled();
    });

    it("answers 500 without details when the database write fails", async () => {
      const agent = await loggedInAgent();
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      mocks.historyUpsert.mockReturnValue({ lean: () => Promise.reject(new Error("write failed")) });

      const res = await agent.post("/api/users/me/history").send({ movieId: 603 });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: "Internal server error" });
    });
  });

  describe("DELETE /api/users/me/history", () => {
    it("clears only the logged-in user's history", async () => {
      const agent = await loggedInAgent();
      mocks.historyDeleteMany.mockResolvedValue({ deletedCount: 2 });

      const res = await agent.delete("/api/users/me/history");

      expect(res.status).toBe(204);
      expect(mocks.historyDeleteMany).toHaveBeenCalledWith({ userId: "user-123" });
    });

    it("requires a logged-in user", async () => {
      const res = await request(app).delete("/api/users/me/history");

      expect(res.status).toBe(401);
      expect(mocks.historyDeleteMany).not.toHaveBeenCalled();
    });
  });
});
