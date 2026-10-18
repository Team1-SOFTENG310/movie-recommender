// src/routes/movies.routes.ts
import { Router } from "express";
import { createMoviesController, type MoviesDeps } from "../controllers/movies.controller.js";

export function createMoviesRouter(deps: MoviesDeps): Router {
  const router = Router();
  const { getRandomMovie } = createMoviesController(deps);

  router.get("/random", getRandomMovie);

  return router;
}
