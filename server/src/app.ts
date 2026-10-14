import express, { type Express } from "express";
import cors from "cors";
import type { AppConfig } from "./config.js";
import { isDatabaseConnected } from "./db.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { createMoviesRouter } from "./routes/movies.routes.js";
import { createTmdbClient, type TmdbClient } from "./tmdb/tmdb.client.js";

export interface AppDeps {
  tmdb: TmdbClient;
  isDatabaseReady: () => boolean;
}

export interface HealthResponse {
  status: "ok" | "unavailable";
  database: "connected" | "disconnected";
}

export function createApp(
  config: AppConfig,
  deps: AppDeps = {
    tmdb: createTmdbClient(config.tmdbApiKey),
    isDatabaseReady: isDatabaseConnected,
  },
): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json());

  app.get<{}, HealthResponse>("/api/health", (_req, res) => {
    const ready = deps.isDatabaseReady();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "unavailable",
      database: ready ? "connected" : "disconnected",
    });
  });
  app.use("/api/movies", createMoviesRouter(deps));

  // Must come after every route
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
