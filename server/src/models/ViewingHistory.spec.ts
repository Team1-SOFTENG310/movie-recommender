import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { ViewingHistory } from "./ViewingHistory.js";

describe("ViewingHistory model", () => {
  it("stores one user's movie ID and defaults the viewed time", () => {
    const userId = new mongoose.Types.ObjectId();
    const history = new ViewingHistory({ userId, movieId: 123 });

    expect(history.userId).toEqual(userId);
    expect(history.movieId).toBe(123);
    expect(history.lastViewedAt).toBeInstanceOf(Date);
  });

  it("requires a user ID and a positive integer movie ID", async () => {
    const missingFields = new ViewingHistory();
    await expect(missingFields.validate()).rejects.toMatchObject({
      errors: {
        userId: expect.anything(),
        movieId: expect.anything(),
      },
    });

    const invalidMovie = new ViewingHistory({
      userId: new mongoose.Types.ObjectId(),
      movieId: 1.5,
    });
    await expect(invalidMovie.validate()).rejects.toMatchObject({
      errors: { movieId: expect.anything() },
    });
  });

  it("enforces one history record per user and movie and indexes recent history", () => {
    const indexes = ViewingHistory.schema.indexes();

    expect(
      indexes.some(
        ([fields, options]) =>
          fields.userId === 1 && fields.movieId === 1 && options.unique,
      ),
    ).toBe(true);
    expect(
      indexes.some(
        ([fields]) => fields.userId === 1 && fields.lastViewedAt === -1,
      ),
    ).toBe(true);
  });
});
