// src/routes/auth.routes.ts
import { Router } from "express";
import type { AppConfig } from "../config.js";
import { createAuthController } from "../controllers/auth.controller.js";
import { createRequireDatabase } from "../middleware/account.middleware.js";

export interface AuthDeps {
  isDatabaseReady: () => boolean;
}

export function createAuthRouter(config: Pick<AppConfig, "isProduction">, deps: AuthDeps): Router {
  const router = Router();
  const { signUp, logIn, logOut, getCurrentUser } = createAuthController(config);
  const requireDatabase = createRequireDatabase(deps.isDatabaseReady);

  router.post("/signup", requireDatabase, signUp);
  router.post("/login", requireDatabase, logIn);
  router.post("/logout", logOut);
  router.get("/me", requireDatabase, getCurrentUser);

  return router;
}
