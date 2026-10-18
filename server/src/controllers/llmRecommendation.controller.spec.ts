import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createLlmRecommendationController, type MovieQuery } from './llmRecommendation.controller.js';

// No TMDB key, so recommendations are returned without poster lookups
const { getLlmRecommendations } = createLlmRecommendationController({ llmApiKey: 'test-llm-key' });

// mock setup for the OpenAI SDK module
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

describe('getLlmRecommendations Controller', () => {
  let req: Partial<Request<{}, {}, {}, MovieQuery>>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('Query Parameter Validation', () => {
    it('returns status 400 when "movie" query parameter is missing', async () => {
      req.query = { releaseYear: '2010' };

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters. Both "movie" and "releaseYear" are required.',
      });
    });

    it('returns status 400 when "releaseYear" query parameter is missing', async () => {
      req.query = { movie: 'Inception' };

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters. Both "movie" and "releaseYear" are required.',
      });
    });

    it('returns status 400 when "releaseYear" is not a valid number', async () => {
      req.query = { movie: 'Inception', releaseYear: 'invalid-year' };

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid "releaseYear" parameter. Must be a valid numeric year.',
      });
    });
  });

  describe('Success State', () => {
    it('returns status 200 with structured recommendation data when OpenAI responds successfully', async () => {
      req.query = { movie: 'Inception', releaseYear: '2010' };

      const mockLlmResponse = {
        userInterestSummary: 'Likes mind-bending science fiction thrillers.',
        recommendations: [
          {
            title: 'Interstellar',
            releaseYear: 2014,
            justification: 'Shares theme of deep human emotion within high-concept sci-fi.',
            imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
            movieId: ''
          },
          {
            title: 'Shutter Island',
            releaseYear: 2010,
            justification: 'Directed by Christopher Nolan style psychological depth.',
            imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
            movieId: ''
          },
          {
            title: 'The Matrix',
            releaseYear: 1999,
            justification: 'Features reality-bending mechanics and philosophical themes.',
            imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
            movieId: ''
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockLlmResponse),
            },
          },
        ],
      });

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        selectedMovie: {
          title: 'Inception',
          releaseYear: 2010,
        },
        data: mockLlmResponse,
      });
    });
  });

  describe('OpenAI Error States', () => {
    it('returns status 500 when OpenAI returns an empty choice content', async () => {
      req.query = { movie: 'Inception', releaseYear: '2010' };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Received an empty response from OpenAI.',
      });
    });

    it('returns status 500 when OpenAI response contains invalid JSON', async () => {
      req.query = { movie: 'Inception', releaseYear: '2010' };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Not valid JSON' } }],
      });

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'An internal server error occurred while processing your request.',
        })
      );
    });

    it('returns status 500 when OpenAI SDK throws an API or network error', async () => {
      req.query = { movie: 'Inception', releaseYear: '2010' };

      mockCreate.mockRejectedValueOnce(new Error('OpenAI API Connection Timeout'));

      await getLlmRecommendations(req as Request<{}, {}, {}, MovieQuery>, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'An internal server error occurred while processing your request.',
        message: 'AI recommendations failed.',
      });
    });
  });
});