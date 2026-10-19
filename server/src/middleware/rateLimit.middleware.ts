// src/middleware/rateLimit.middleware.ts
import type { RequestHandler } from "express";
import type { ErrorResponse } from "../errors.js";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  now?: () => number;
}

/**
 * Fixed-window limit per client IP, kept in memory. Enough for one server process;
 * running several would need a shared store such as MongoDB or Redis.
 */
export function createRateLimiter({
  windowMs,
  max,
  message,
  now = Date.now,
}: RateLimitOptions): RequestHandler<unknown, ErrorResponse> {
  const windows = new Map<string, { start: number; count: number }>();

  return (req, res, next) => {
    const time = now();
    const key = req.ip ?? "unknown";
    let entry = windows.get(key);

    if (!entry || time - entry.start >= windowMs) {
      entry = { start: time, count: 0 };
      windows.set(key, entry);
      // Drop expired entries now and then so the map can't grow without bound.
      if (windows.size > 1000) {
        for (const [ip, window] of windows) {
          if (time - window.start >= windowMs) windows.delete(ip);
        }
      }
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.start + windowMs - time) / 1000));
      res.status(429).json({ message });
      return;
    }

    next();
  };
}
