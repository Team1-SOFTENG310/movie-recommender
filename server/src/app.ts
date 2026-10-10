import express, { type Express } from "express";
import cors from "cors";
import type { AppConfig } from "./config.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { createMoviesRouter } from "./routes/movies.routes.js";
import { createTmdbClient, type TmdbClient } from "./tmdb/tmdb.client.js";

export interface AppDeps {
  tmdb: TmdbClient;
}

export function createApp(
  config: AppConfig,
  deps: AppDeps = { tmdb: createTmdbClient(config.tmdbApiKey) },
): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/movies", createMoviesRouter(deps));

  // Must come after every route
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
