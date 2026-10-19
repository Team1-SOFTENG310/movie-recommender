// src/controllers/history.controller.ts
import type { RequestHandler } from "express";
import { HttpError, type ErrorResponse } from "../errors.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { ViewingHistory } from "../models/ViewingHistory.js";

// Movies per page of history; the profile loads further pages on request.
export const HISTORY_LIMIT = 20;

export interface ViewedMovie {
  movieId: number;
  viewedAt: string;
}

export interface HistoryResponse {
  history: ViewedMovie[];
  page: number;
  totalPages: number;
}

interface HistoryQuery {
  page?: unknown;
}

interface RecordViewBody {
  movieId?: unknown;
}

// requireLogin runs first, so a missing userId here is a programming error.
// Missing means the first page; anything else must be a whole number from 1.
function parsePage(page: unknown): number {
  if (page === undefined) return 1;
  const parsed = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "page must be a positive integer");
  }
  return parsed;
}

function sessionUserId(userId: string | undefined): string {
  if (!userId) throw new HttpError(401, "Not authenticated");
  return userId;
}

export function createHistoryController() {
  /** One page of the user's viewed movies, newest first. */
  const listHistory: RequestHandler<{}, HistoryResponse | ErrorResponse, unknown, HistoryQuery> =
    asyncHandler(async (req, res) => {
      const userId = sessionUserId(req.session.userId);
      const page = parsePage(req.query.page);
      const [entries, total] = await Promise.all([
        ViewingHistory.find({ userId })
          .sort({ lastViewedAt: -1 })
          .skip((page - 1) * HISTORY_LIMIT)
          .limit(HISTORY_LIMIT)
          .lean(),
        ViewingHistory.countDocuments({ userId }),
      ]);

      res.json({
        history: entries.map((entry) => ({
          movieId: entry.movieId,
          viewedAt: entry.lastViewedAt.toISOString(),
        })),
        page,
        totalPages: Math.ceil(total / HISTORY_LIMIT),
      });
    });

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
