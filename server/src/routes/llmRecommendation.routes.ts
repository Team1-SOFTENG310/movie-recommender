import { Router } from 'express';
import {
  createLlmRecommendationController,
  type LlmRecommendationConfig,
} from '../controllers/llmRecommendation.controller.js';

export function createLlmRecommendationRouter(config: LlmRecommendationConfig): Router {
  const router = Router();
  const { getLlmRecommendations } = createLlmRecommendationController(config);

  router.get("/", getLlmRecommendations);

  return router;
}
