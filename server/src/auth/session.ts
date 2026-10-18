// src/auth/session.ts
import MongoStore from "connect-mongo";
import session from "express-session";
import mongoose from "mongoose";
import type { RequestHandler } from "express";
import type { AppConfig } from "../config.js";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export const SESSION_COOKIE_NAME = "movie.sid";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEVELOPMENT_SECRET = "movie-recommender-development-session-secret";

export function sessionCookieOptions(config: Pick<AppConfig, "isProduction">) {
  return { httpOnly: true, secure: config.isProduction, sameSite: "lax" as const };
}

// Sessions live in MongoDB when it's connected at startup; otherwise in memory (degraded mode)
export function createSessionMiddleware(
  config: Pick<AppConfig, "isProduction" | "sessionSecret">,
): RequestHandler {
  if (config.isProduction && !config.sessionSecret) {
    throw new Error("SESSION_SECRET is required in production");
  }

  const store =
    mongoose.connection.readyState === 1
      ? MongoStore.create({
          client: mongoose.connection.getClient(),
          collectionName: "sessions",
          ttl: SESSION_MAX_AGE_MS / 1000,
        })
      : undefined;

  return session({
    name: SESSION_COOKIE_NAME,
    secret: config.sessionSecret ?? DEVELOPMENT_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { ...sessionCookieOptions(config), maxAge: SESSION_MAX_AGE_MS },
  });
}
