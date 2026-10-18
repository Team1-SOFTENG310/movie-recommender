import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichMoviesWithImages, DEFAULT_POSTER_IMAGE, type RecommendedMovie } from './tmdb.services.js';

const TMDB_API_KEY = 'mock-tmdb-api-key';

describe('enrichMoviesWithImages Service', () => {
  const mockMovies: RecommendedMovie[] = [
    {
      title: 'Inception',
      releaseYear: 2010,
      justification: 'Mind-bending sci-fi thriller.',
    },
    {
      title: 'Interstellar',
      releaseYear: 2014,
      justification: 'Epic space exploration.',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('appends poster URLs when TMDB API returns valid matching movies', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              results: [{ poster_path: '/inception-poster.jpg', id: 603 }],
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              results: [{ poster_path: '/interstellar-poster.jpg', id: 157336 }],
            }),
            { status: 200 }
          )
        );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(fetch).toHaveBeenCalledTimes(2);

      // Verify the query URL constructed for the first movie
      const firstCallUrl = new URL((fetch as any).mock.calls[0][0]);
      expect(firstCallUrl.origin + firstCallUrl.pathname).toBe(
        'https://api.themoviedb.org/3/search/movie'
      );
      expect(firstCallUrl.searchParams.get('api_key')).toBe('mock-tmdb-api-key');
      expect(firstCallUrl.searchParams.get('query')).toBe('Inception');
      expect(firstCallUrl.searchParams.get('primary_release_year')).toBe('2010');

      // Verify enriched output
      expect(result).toEqual([
        {
          title: 'Inception',
          releaseYear: 2010,
          justification: 'Mind-bending sci-fi thriller.',
          imageUrl: 'https://image.tmdb.org/t/p/w500/inception-poster.jpg',
          movieId: '603'
        },
        {
          title: 'Interstellar',
          releaseYear: 2014,
          justification: 'Epic space exploration.',
          imageUrl: 'https://image.tmdb.org/t/p/w500/interstellar-poster.jpg',
          movieId: '157336'
        },
      ]);
    });

    it('handles movies missing a releaseYear by querying without primary_release_year', async () => {
      const movieWithoutYear: RecommendedMovie[] = [
        { title: 'The Matrix', releaseYear: '', justification: 'Classic action.' },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ poster_path: '/matrix-poster.jpg' }],
          }),
          { status: 200 }
        )
      );

      const result = await enrichMoviesWithImages(movieWithoutYear, TMDB_API_KEY);

      const calledUrl = new URL((fetch as any).mock.calls[0][0]);
      expect(calledUrl.searchParams.has('primary_release_year')).toBe(false);
      expect(result[0]?.imageUrl).toBe(
        'https://image.tmdb.org/t/p/w500/matrix-poster.jpg'
      );
    });
  });

  describe('Edge & Missing Data Cases', () => {
    it('returns default image when TMDB_API_KEY is not configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = await enrichMoviesWithImages(mockMovies, undefined);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result).toEqual([
        { ...mockMovies[0], imageUrl: DEFAULT_POSTER_IMAGE, movieId: "" },
        { ...mockMovies[1], imageUrl: DEFAULT_POSTER_IMAGE, movieId: "" },
      ]);
    });

    it('returns default image when TMDB search yields no results', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(result[0]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
      expect(result[1]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
    });

    it('returns default image when the top result has poster_path set to null', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [{ poster_path: null }],
          }),
          { status: 200 }
        )
      );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(result[0]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
    });
  });

  describe('Error Cases', () => {
    it('returns default image when TMDB returns an HTTP error status code (e.g. 401, 500)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status_message: 'Invalid API key' }), {
          status: 401,
        })
      );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(result[0]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
      expect(result[1]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
    });

    it('returns default image when fetch throws a network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('Failed to fetch / Network connection lost')
      );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(result[0]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
      expect(result[1]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
    });

    it('returns default image when fetch times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      );

      const result = await enrichMoviesWithImages(mockMovies, TMDB_API_KEY);

      expect(result[0]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
      expect(result[1]?.imageUrl).toBe(DEFAULT_POSTER_IMAGE);
    });
  });
});