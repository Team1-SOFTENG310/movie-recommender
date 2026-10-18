// src/routes/auth.routes.ts
import { Router, type RequestHandler } from "express";
import type { AppConfig } from "../config.js";
import type { ErrorResponse } from "../errors.js";
import { createAuthController } from "../controllers/auth.controller.js";

export interface AuthDeps {
  isDatabaseReady: () => boolean;
}

export function createAuthRouter(config: Pick<AppConfig, "isProduction">, deps: AuthDeps): Router {
  const router = Router();
  const { signUp, logIn, logOut, getCurrentUser } = createAuthController(config);

  const requireDatabase: RequestHandler<{}, ErrorResponse> = (_req, res, next) => {
    if (!deps.isDatabaseReady()) {
      res.status(503).json({ message: "Account service is unavailable" });
      return;
    }
    next();
  };

  router.post("/signup", requireDatabase, signUp);
  router.post("/login", requireDatabase, logIn);
  router.post("/logout", logOut);
  router.get("/me", requireDatabase, getCurrentUser);

  return router;
}
