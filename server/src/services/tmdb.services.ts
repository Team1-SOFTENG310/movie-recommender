export interface RecommendedMovie {
  title: string;
  releaseYear: number | string;
  justification: string;
  imageUrl?: string | null;
  movieId?: string;
}

interface TmdbMovieResult {
  poster_path: string | null;
  id: number;
}

interface TmdbSearchResponse {
  results: TmdbMovieResult[];
}

export const DEFAULT_POSTER_IMAGE = 'https://via.placeholder.com/300x450?text=No+Poster';

/**
 * Searches TMDB for each recommended movie and appends the poster image URL.
 * Executes all searches concurrently
 */
export const enrichMoviesWithImages = async (
  movies: RecommendedMovie[],
  tmdbApiKey: string | undefined,
): Promise<RecommendedMovie[]> => {
  if (!tmdbApiKey) {
    console.warn('TMDB API key is not configured; recommendations will have no images.');
    return movies.map((movie) => ({ ...movie, imageUrl: DEFAULT_POSTER_IMAGE, movieId: '' }));
  }

  const enrichedMovies = await Promise.all(
    movies.map(async (movie): Promise<RecommendedMovie> => {
      try {
        const searchUrl = new URL('https://api.themoviedb.org/3/search/movie');
        searchUrl.searchParams.append('api_key', tmdbApiKey);
        searchUrl.searchParams.append('query', movie.title);

        if (movie.releaseYear) {
          searchUrl.searchParams.append(
            'primary_release_year',
            String(movie.releaseYear)
          );
        }

        const response = await fetch(searchUrl.toString(), {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return { ...movie, imageUrl: DEFAULT_POSTER_IMAGE, movieId: '' };
        }

        const data = (await response.json()) as TmdbSearchResponse;
        const topResult = data.results[0];

        // Construct full image URL
        const imageUrl = topResult?.poster_path
          ? `https://image.tmdb.org/t/p/w500${topResult.poster_path}`
          : DEFAULT_POSTER_IMAGE;

        const movieId = topResult?.id ? String(topResult.id) : '';

        return {
          ...movie,
          imageUrl,
          movieId,
        };
      } catch (error) {
        console.error(`Failed to fetch TMDB image for "${movie.title}":`, error);
        return { ...movie, imageUrl: DEFAULT_POSTER_IMAGE, movieId: '' };
      }
    })
  );

  return enrichedMovies;
};
