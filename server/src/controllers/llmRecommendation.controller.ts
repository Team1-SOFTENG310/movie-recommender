import type { Request, Response } from 'express';
import OpenAI from 'openai';
import type { AppConfig } from '../config.js';
import { enrichMoviesWithImages, type RecommendedMovie } from '../services/tmdb.services.js';

// Type definitions for the incoming request query parameters
export interface MovieQuery {
  movie?: string;
  releaseYear?: string;
}

// Type definitions for the OpenAI structured response payload
interface OpenAIRecommendationPayload {
  userInterestSummary: string;
  recommendations: RecommendedMovie[];
}

export type LlmRecommendationConfig = Partial<Pick<AppConfig, 'llmApiKey' | 'tmdbApiKey'>>;

export interface LlmRecommendationOptions {
  /** How long a movie's recommendations are reused. 0 turns caching off. */
  cacheTtlMs?: number;
  now?: () => number;
}

// Every OpenAI call costs money and takes several seconds, and the same movie
// tends to be asked about again, so successful answers are reused for a while.
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHED_MOVIES = 500;

export function createLlmRecommendationController(
  { llmApiKey, tmdbApiKey }: LlmRecommendationConfig,
  { cacheTtlMs = DEFAULT_CACHE_TTL_MS, now = Date.now }: LlmRecommendationOptions = {},
) {
  const cache = new Map<string, { expiresAt: number; body: unknown }>();

  /**
   * Express Route Handler for OpenAI LLM Recommendations
   */
  const getLlmRecommendations = async (
    req: Request<{}, {}, {}, MovieQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const { movie, releaseYear } = req.query;

      // Validate query parameters
      if (!movie || !releaseYear) {
        res.status(400).json({
          error: 'Missing required query parameters. Both "movie" and "releaseYear" are required.',
        });
        return;
      }

      const yearParsed = Number.parseInt(releaseYear, 10);
      if (Number.isNaN(yearParsed)) {
        res.status(400).json({
          error: 'Invalid "releaseYear" parameter. Must be a valid numeric year.',
        });
        return;
      }

      const cacheKey = `${String(movie).trim().toLowerCase()}|${yearParsed}`;
      const cached = cache.get(cacheKey);
      if (cacheTtlMs > 0 && cached && cached.expiresAt > now()) {
        res.status(200).json(cached.body);
        return;
      }

      const openai = new OpenAI({
        apiKey: llmApiKey,
        timeout: 30 * 1000,
      });

      // system prompt
      const systemPrompt = `
You are a movie recommendation system. Given a movie title and its release year, produce a JSON object with the following fields:
1. "userInterestSummary": A concise summary of the user's potential interests based on the selected movie.
2. "recommendations": An array of exactly 3 recommended movies, where each item has:
   - "title": (string)
   - "releaseYear": (number)
   - "justification": (string) A clear justification for why the user would enjoy this movie based on their selected movie.
`.trim();

      const userPrompt = `Selected Movie: "${movie}" (${yearParsed}). Generate a summary of my potential interests and recommend 3 movies with justifications.`;

      // Make API call to OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        res.status(500).json({ error: 'Received an empty response from OpenAI.' });
        return;
      }

      // Parse structured JSON response
      const parsedData: OpenAIRecommendationPayload = JSON.parse(rawContent);

      if (!validateMoviePayload(parsedData)) {
        res.status(500).json({
          error: 'Received invalid recommendation payload from OpenAI. Expected 3 complete recommendations.',
        });
        return;
      }

      // enrich with image URLs from TMDB
      const enrichedMovies = await enrichMoviesWithImages(parsedData.recommendations, tmdbApiKey);

      // Return structured recommendation data
      const body = {
        success: true,
        selectedMovie: {
          title: movie,
          releaseYear: yearParsed,
        },
        data: {
          userInterestSummary: parsedData.userInterestSummary,
          recommendations: enrichedMovies,
        },
      };

      if (cacheTtlMs > 0) {
        // Maps keep insertion order, so the first key is the oldest entry.
        const oldest = cache.keys().next().value;
        if (cache.size >= MAX_CACHED_MOVIES && oldest !== undefined) cache.delete(oldest);
        cache.set(cacheKey, { expiresAt: now() + cacheTtlMs, body });
      }

      res.status(200).json(body);
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: 'An internal server error occurred while processing your request.',
        message: 'AI recommendations failed.',
      });
    }
  };

  return { getLlmRecommendations };
}

function validateMoviePayload(payload: any): payload is OpenAIRecommendationPayload {
  return (
    typeof payload?.userInterestSummary === 'string' &&
    payload.userInterestSummary.trim() !== '' &&
    Array.isArray(payload?.recommendations) &&
    payload.recommendations.length === 3 &&
    payload.recommendations.every(
      (rec: any) =>
        typeof rec?.title === 'string' &&
        rec.title.trim() !== '' &&
        rec?.releaseYear !== undefined &&
        rec?.releaseYear !== null &&
        String(rec.releaseYear).trim() !== '' &&
        !Number.isNaN(Number(rec.releaseYear)) &&
        typeof rec?.justification === 'string' &&
        rec.justification.trim() !== ''
    )
  );
}
