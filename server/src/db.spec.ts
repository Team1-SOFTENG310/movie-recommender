import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { connectDatabase, isDatabaseConnected } from "./db.js";

describe("connectDatabase", () => {
  it("rejects when the MongoDB URI is missing", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect");

    await expect(connectDatabase("")).rejects.toThrow("MONGODB_URI is required");
    await expect(connectDatabase(undefined)).rejects.toThrow("MONGODB_URI is required");
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("connects Mongoose using the provided URI", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);

    await connectDatabase("mongodb://localhost/movie-recommender-test");

    expect(connectSpy).toHaveBeenCalledWith("mongodb://localhost/movie-recommender-test");
  });
});

describe("isDatabaseConnected", () => {
  it.each([
    [0, false],
    [1, true],
    [2, false],
    [3, false],
  ])("returns %s → %s for readyState", (state, expected) => {
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(state);

    expect(isDatabaseConnected()).toBe(expected);
  });
});
