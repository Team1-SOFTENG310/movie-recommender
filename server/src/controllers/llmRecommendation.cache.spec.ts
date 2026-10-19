import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createLlmRecommendationController, type MovieQuery } from './llmRecommendation.controller.js';

const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function () {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

const payload = {
  userInterestSummary: 'Likes heists.',
  recommendations: [1, 2, 3].map((n) => ({
    title: `Movie ${n}`,
    releaseYear: 2000 + n,
    justification: 'Similar.',
  })),
};

function openAiAnswers(content: string) {
  mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });
}

async function ask(handler: ReturnType<typeof createLlmRecommendationController>['getLlmRecommendations'], movie: string) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const req = { query: { movie, releaseYear: '1995' } };
  await handler(req as unknown as Request<{}, {}, {}, MovieQuery>, res as unknown as Response);
  return res;
}

describe('getLlmRecommendations caching', () => {
  let time: number;
  let handler: ReturnType<typeof createLlmRecommendationController>['getLlmRecommendations'];

  beforeEach(() => {
    vi.clearAllMocks();
    time = 0;
    ({ getLlmRecommendations: handler } = createLlmRecommendationController(
      { llmApiKey: 'test-llm-key' },
      { cacheTtlMs: 60_000, now: () => time },
    ));
  });

  it('reuses a recent answer for the same movie instead of calling OpenAI again', async () => {
    openAiAnswers(JSON.stringify(payload));

    const first = await ask(handler, 'Heat');
    const second = await ask(handler, ' heat ');

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(second.status).toHaveBeenCalledWith(200);
    expect(second.json).toHaveBeenCalledWith(first.json.mock.calls[0]?.[0]);
  });

  it('asks OpenAI again once the cached answer has expired', async () => {
    openAiAnswers(JSON.stringify(payload));

    await ask(handler, 'Heat');
    time = 60_000;
    await ask(handler, 'Heat');

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    openAiAnswers('not json');
    const failed = await ask(handler, 'Heat');
    expect(failed.status).toHaveBeenCalledWith(500);

    openAiAnswers(JSON.stringify(payload));
    const retried = await ask(handler, 'Heat');

    expect(retried.status).toHaveBeenCalledWith(200);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
