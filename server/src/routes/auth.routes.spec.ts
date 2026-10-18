import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { fakeDeps, testConfig } from "../../test/fixtures.js";

const mocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userFindById: vi.fn(),
  userFindOne: vi.fn(),
  passwordHash: vi.fn(),
  passwordCompare: vi.fn(),
}));

vi.mock("../models/User.js", () => ({
  User: {
    create: mocks.userCreate,
    findById: mocks.userFindById,
    findOne: mocks.userFindOne,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.passwordHash,
    compare: mocks.passwordCompare,
  },
}));

let databaseReady = true;
const app = createApp(testConfig, fakeDeps({ isDatabaseReady: () => databaseReady }));

const account = {
  _id: "user-123",
  username: "film_fan",
  email: "film@example.com",
  passwordHash: "stored-hash",
};

describe("authentication routes", () => {
  beforeEach(() => {
    databaseReady = true;
    vi.clearAllMocks();
  });

  it("signs up with normalized identity fields and creates a session", async () => {
    mocks.passwordHash.mockResolvedValue("stored-hash");
    mocks.userCreate.mockResolvedValue(account);
    const agent = request.agent(app);

    const response = await agent.post("/api/auth/signup").send({
      username: " Film_Fan ",
      email: " FILM@example.com ",
      password: "long-password",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: { id: "user-123", username: "film_fan", email: "film@example.com" },
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(mocks.passwordHash).toHaveBeenCalledWith("long-password", 12);
    expect(mocks.userCreate).toHaveBeenCalledWith({
      username: "film_fan",
      email: "film@example.com",
      passwordHash: "stored-hash",
    });

    mocks.userFindById.mockResolvedValue(account);
    const currentUser = await agent.get("/api/auth/me");
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.user.id).toBe("user-123");
  });

  it("rejects invalid signup fields without creating an account", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      username: "ab",
      email: "not-an-email",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it.each([
    ".first@example.com",
    "first..last@example.com",
    "first@example..com",
    `${"a".repeat(255)}@example.com`,
  ])("rejects malformed or oversized email %s", async (email) => {
    const response = await request(app).post("/api/auth/signup").send({
      username: "film_fan",
      email,
      password: "long-password",
    });

    expect(response.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("returns conflict when a username or email is already registered", async () => {
    mocks.passwordHash.mockResolvedValue("stored-hash");
    mocks.userCreate.mockRejectedValue({ code: 11000 });

    const response = await request(app).post("/api/auth/signup").send({
      username: "film_fan",
      email: "film@example.com",
      password: "long-password",
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already registered/);
  });

  it("logs in with a username or email and keeps the session across requests", async () => {
    mocks.userFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(account) });
    mocks.passwordCompare.mockResolvedValue(true);
    const agent = request.agent(app);

    const login = await agent.post("/api/auth/login").send({
      identifier: "FILM@example.com",
      password: "long-password",
    });

    expect(login.status).toBe(200);
    expect(mocks.userFindOne).toHaveBeenCalledWith({
      $or: [{ username: "film@example.com" }, { email: "film@example.com" }],
    });
    expect(mocks.passwordCompare).toHaveBeenCalledWith("long-password", "stored-hash");

    mocks.userFindById.mockResolvedValue(account);
    const currentUser = await agent.get("/api/auth/me");
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.user.id).toBe("user-123");
  });

  it("rejects incorrect credentials with a generic error", async () => {
    mocks.userFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(account) });
    mocks.passwordCompare.mockResolvedValue(false);

    const response = await request(app).post("/api/auth/login").send({
      identifier: "film_fan",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Invalid username\/email or password/);
  });

  it("logs out and invalidates the session", async () => {
    mocks.userFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(account) });
    mocks.passwordCompare.mockResolvedValue(true);
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      identifier: "film_fan",
      password: "long-password",
    });
    const logout = await agent.post("/api/auth/logout");
    const currentUser = await agent.get("/api/auth/me");

    expect(logout.status).toBe(200);
    expect(currentUser.status).toBe(401);
  });

  it("returns unavailable while MongoDB is disconnected", async () => {
    databaseReady = false;

    const response = await request(app).post("/api/auth/login").send({
      identifier: "film_fan",
      password: "long-password",
    });

    expect(response.status).toBe(503);
  });
});
