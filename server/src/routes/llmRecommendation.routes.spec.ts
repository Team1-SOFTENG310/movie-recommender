import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createLlmRecommendationRouter } from './llmRecommendation.routes.js';

// mock setup for OpenAI SDK module
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

const app = express();
app.use(express.json());
app.use('/api/llm-recommender', createLlmRecommendationRouter({ llmApiKey: 'test-llm-key' }));

describe('GET /api/llm-recommender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 - Returns movie recommendations successfully', async () => {
    const mockPayload = {
      userInterestSummary: 'Prefers high-concept sci-fi thrillers.',
      recommendations: [
        {
          title: 'Blade Runner 2049',
          releaseYear: 2017,
          justification: 'Matches visual atmosphere and sci-fi genre.',
          imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
          movieId: '',
        },
        {
          title: 'Interstellar',
          releaseYear: 2014,
          justification: 'Explores deep space and complex emotional narratives.',
          imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
          movieId: '',
        },
        {
          title: 'The Matrix',
          releaseYear: 1999,
          justification: 'Groundbreaking reality-bending science fiction.',
          imageUrl: 'https://via.placeholder.com/300x450?text=No+Poster',
          movieId: '',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockPayload) } }],
    });

    const res = await request(app)
      .get('/api/llm-recommender')
      .query({ movie: 'Inception', releaseYear: '2010' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      selectedMovie: {
        title: 'Inception',
        releaseYear: 2010,
      },
      data: mockPayload,
    });
  });

  it('500 - Returns error when OpenAI payload does not contain exactly 3 recommendations or has empty fields', async () => {
    const invalidPayload = {
      userInterestSummary: '',
      recommendations: [
        {
          title: 'Blade Runner 2049',
          releaseYear: 2017,
          justification: 'Matches visual atmosphere and sci-fi genre.',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(invalidPayload) } }],
    });

    const res = await request(app)
      .get('/api/llm-recommender')
      .query({ movie: 'Inception', releaseYear: '2010' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'Received invalid recommendation payload from OpenAI. Expected 3 complete recommendations.',
    });
  });

  it('400 - Returns error when query parameters are missing', async () => {
    const res = await request(app).get('/api/llm-recommender');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Missing required query parameters. Both "movie" and "releaseYear" are required.',
    });
  });

  it('400 - Returns error when releaseYear is non-numeric', async () => {
    const res = await request(app)
      .get('/api/llm-recommender')
      .query({ movie: 'Inception', releaseYear: 'abcd' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid "releaseYear" parameter. Must be a valid numeric year.',
    });
  });

  it('500 - Returns internal server error when OpenAI fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const res = await request(app)
      .get('/api/llm-recommender')
      .query({ movie: 'Inception', releaseYear: '2010' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'An internal server error occurred while processing your request.',
      message: 'AI recommendations failed.',
    });
  });
});