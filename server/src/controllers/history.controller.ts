// src/controllers/history.controller.ts
import type { RequestHandler } from "express";
import { HttpError, type ErrorResponse } from "../errors.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { ViewingHistory } from "../models/ViewingHistory.js";

// The profile shows recent movies, not a full archive.
export const HISTORY_LIMIT = 20;

export interface ViewedMovie {
  movieId: number;
  viewedAt: string;
}

export interface HistoryResponse {
  history: ViewedMovie[];
}

interface RecordViewBody {
  movieId?: unknown;
}

// requireLogin runs first, so a missing userId here is a programming error.
function sessionUserId(userId: string | undefined): string {
  if (!userId) throw new HttpError(401, "Not authenticated");
  return userId;
}

export function createHistoryController() {
  /** The user's most recently viewed movies, newest first. */
  const listHistory: RequestHandler<{}, HistoryResponse | ErrorResponse> = asyncHandler(
    async (req, res) => {
      const userId = sessionUserId(req.session.userId);
      const entries = await ViewingHistory.find({ userId })
        .sort({ lastViewedAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean();

      res.json({
        history: entries.map((entry) => ({
          movieId: entry.movieId,
          viewedAt: entry.lastViewedAt.toISOString(),
        })),
      });
    },
  );

  /** Records that the user opened a movie; viewing it again moves it to the top. */
  const recordView: RequestHandler<{}, ViewedMovie | ErrorResponse, RecordViewBody | undefined> =
    asyncHandler(async (req, res) => {
      const userId = sessionUserId(req.session.userId);
      const movieId = req.body?.movieId;
      if (typeof movieId !== "number" || !Number.isInteger(movieId) || movieId <= 0) {
        throw new HttpError(400, "movieId must be a positive integer");
      }

      const entry = await ViewingHistory.findOneAndUpdate(
        { userId, movieId },
        { lastViewedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();

      if (!entry) throw new HttpError(500, "Could not record the movie");
      res.json({ movieId: entry.movieId, viewedAt: entry.lastViewedAt.toISOString() });
    });

  /** Deletes the user's whole viewing history. */
  const clearHistory: RequestHandler = asyncHandler(async (req, res) => {
    const userId = sessionUserId(req.session.userId);
    await ViewingHistory.deleteMany({ userId });
    res.status(204).end();
  });

  return { listHistory, recordView, clearHistory };
}
