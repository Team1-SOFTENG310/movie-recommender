// src/routes/users.routes.ts
import { Router } from "express";
import type { AppConfig } from "../config.js";
import { createAuthController } from "../controllers/auth.controller.js";
import { createHistoryController } from "../controllers/history.controller.js";
import { createRequireDatabase, requireLogin } from "../middleware/account.middleware.js";

export interface UsersDeps {
  isDatabaseReady: () => boolean;
}

export function createUsersRouter(config: Pick<AppConfig, "isProduction">, deps: UsersDeps): Router {
  const router = Router();
  const requireDatabase = createRequireDatabase(deps.isDatabaseReady);
  const { getCurrentUser } = createAuthController(config);
  const { listHistory, recordView, clearHistory } = createHistoryController();

  // Same response as GET /api/auth/me; this is the resource-style path for the current user.
  router.get("/me", requireDatabase, getCurrentUser);

  router.get("/me/history", requireDatabase, requireLogin, listHistory);
  router.post("/me/history", requireDatabase, requireLogin, recordView);
  router.delete("/me/history", requireDatabase, requireLogin, clearHistory);

  return router;
}
