import { useCallback, useEffect, useRef } from "react";
import { PLACEHOLDER_POSTER } from "../constants/images";
import type { Movie } from "../types/movie";
import "./SearchResultsList.css";

interface SearchResultsListProps {
  movies: Movie[];
  isLoading: boolean;
  hasSearched: boolean;
  hasMore: boolean;
  error?: string | null;
  onLoadMore: () => void;
  onRetry?: () => void;
  onMovieClick: (movie: Movie) => void;
}

export default function SearchResultsList({
  movies,
  isLoading,
  hasSearched,
  hasMore,
  error = null,
  onLoadMore,
  onRetry,
  onMovieClick,
}: Readonly<SearchResultsListProps>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // After a failed page, wait for the user to retry rather than re-requesting in a loop.
      if (entries[0]?.isIntersecting && hasMore && !isLoading && !error) {
        onLoadMore();
      }
    },
    [error, hasMore, isLoading, onLoadMore],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [handleIntersect]);

  if (error && movies.length === 0 && !isLoading) {
    return (
      <div className="search-results search-results--empty search-results--error" role="alert">
        <p>Couldn't load movies. Check your connection and try again.</p>
        {onRetry && (
          <button type="button" className="search-results__retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (hasSearched && !isLoading && movies.length === 0) {
    return (
      <div
        className="search-results search-results--empty"
        role="status"
        aria-live="polite"
      >
        <p>No movies found. Try a different title or loosen your filters.</p>
      </div>
    );
  }

  if (!hasSearched && movies.length === 0) {
    return null;
  }

  return (
    <section className="search-results" aria-label="Search results">
      <p className="visually-hidden" role="status" aria-live="polite">
        {`${movies.length} result${movies.length === 1 ? "" : "s"} found`}
      </p>

      <ul className="search-results__grid">
        {movies.map((movie) => (
          <li key={movie.id} className="search-results__item">
            <button
              type="button"
              className="search-results__card"
              onClick={() => onMovieClick(movie)}
              aria-label={`View details for ${movie.title}`}
            >
              <img
                src={movie.posterUrl ?? PLACEHOLDER_POSTER}
                alt=""
                className="search-results__poster"
                loading="lazy"
              />
              <div className="search-results__meta">
                <span className="search-results__title">{movie.title}</span>
                <span className="search-results__year">
                  {movie.year ?? "Unknown year"}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {isLoading && (
        <div
          className="search-results__loading"
          role="status"
          aria-live="polite"
        >
          Loading more results...
        </div>
      )}

      {error && !isLoading && (
        <div className="search-results__error" role="alert">
          <p>Couldn't load more movies.</p>
          {onRetry && (
            <button type="button" className="search-results__retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="search-results__sentinel"
          aria-hidden="true"
        />
      )}
    </section>
  );
}
