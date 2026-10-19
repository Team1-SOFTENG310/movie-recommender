// src/middleware/account.middleware.ts
import type { RequestHandler } from "express";
import type { ErrorResponse } from "../errors.js";

/** Answers 503 while MongoDB is unavailable, since every account route needs it. */
export function createRequireDatabase(isDatabaseReady: () => boolean): RequestHandler<unknown, ErrorResponse> {
  return (_req, res, next) => {
    if (!isDatabaseReady()) {
      res.status(503).json({ message: "Account service is unavailable" });
      return;
    }
    next();
  };
}

/** Answers 401 unless the request belongs to a logged-in session. */
export const requireLogin: RequestHandler<unknown, ErrorResponse> = (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  next();
};
