import { Router } from 'express';
import {
  createLlmRecommendationController,
  type LlmRecommendationConfig,
  type LlmRecommendationOptions,
} from '../controllers/llmRecommendation.controller.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';

// Each request costs OpenAI credit, so one visitor can't make unlimited calls.
const AI_REQUESTS_PER_WINDOW = 20;
const AI_WINDOW_MS = 15 * 60 * 1000;

export function createLlmRecommendationRouter(
  config: LlmRecommendationConfig,
  options?: LlmRecommendationOptions,
): Router {
  const router = Router();
  const { getLlmRecommendations } = createLlmRecommendationController(config, options);
  const limitAiRequests = createRateLimiter({
    windowMs: AI_WINDOW_MS,
    max: AI_REQUESTS_PER_WINDOW,
    message: "Too many AI recommendation requests. Please try again in a few minutes.",
  });

  router.get("/", limitAiRequests, getLlmRecommendations);

  return router;
}
