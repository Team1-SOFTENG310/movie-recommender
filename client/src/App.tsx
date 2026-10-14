import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import SearchBar from "./components/SearchBar.tsx";
import SearchResultsList from "./components/SearchResultsList.tsx";
import FilterPanel from "./components/FilterPanel.tsx";
import { useMovieResults } from "./hooks/useMovieResults.ts";
import type { Movie } from "./types/movie.ts";
import type { DiscoverFilters } from "./api/discoverMovies";
import RandomButton from "./components/RandomButton.tsx";

function App() {
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const [query, setQuery] = useState<string>(() => {
    const savedQuery = sessionStorage.getItem("movieSearchQuery");
    if (!savedQuery) {
      return "";
    }

    try {
      const parsed = JSON.parse(savedQuery);

      if (typeof parsed === "string" && /^[^<>]*$/.test(parsed)) {
        return parsed;
      }
      return "";
    } catch {
      return "";
    }
  });

  const [filters, setFilters] = useState<DiscoverFilters>(() => {
    const savedFilters = sessionStorage.getItem("movieSearchFilters");
    if (!savedFilters) {
      return {};
    }

    try {
      const parsed = JSON.parse(savedFilters);
      const safeFilters: DiscoverFilters = {};

      if (typeof parsed.genre === "number") {
        safeFilters.genre = parsed.genre;
      }
      if (typeof parsed.yearFrom === "number") {
        safeFilters.yearFrom = parsed.yearFrom;
      }
      if (typeof parsed.yearTo === "number") {
        safeFilters.yearTo = parsed.yearTo;
      }
      if (typeof parsed.ratingMin === "number") {
        safeFilters.ratingMin = parsed.ratingMin;
      }
      if (typeof parsed.castId === "number") {
        safeFilters.castId = parsed.castId;
      }

      if (["popularity", "rating", "release_date"].includes(parsed.sort)) {
        safeFilters.sort = parsed.sort;
      }

      return safeFilters;
    } catch {
      return {};
    }
  });

  const { movies, isLoading, hasSearched, hasMore, loadMore } = useMovieResults(
    query,
    filters,
  );

  useEffect(() => {
    if (/^[^<>]*$/.test(query)) {
      sessionStorage.setItem("movieSearchQuery", JSON.stringify(query));
    }
  }, [query]);

  useEffect(() => {
    sessionStorage.setItem("movieSearchFilters", JSON.stringify(filters));
  }, [filters]);

  const handleMovieClick = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  };

  const hasActiveFilters =
    filters.genre !== undefined ||
    filters.ratingMin !== undefined ||
    filters.castId !== undefined ||
    (filters.yearFrom !== undefined && filters.yearFrom !== 1900) ||
    (filters.yearTo !== undefined &&
      filters.yearTo !== new Date().getFullYear());

  return (
    <section id="search-page">
      <SearchBar
        onQueryChange={setQuery}
        isLoading={isLoading}
        initialValue={query}
      />
      <RandomButton />
      <button
        type="button"
        className="filter-toggle"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
      >
        <svg
          className="filter-toggle__icon"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
          />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="filter-toggle__dot" aria-label="Filters active" />
        )}
        <svg
          className="filter-toggle__chevron"
          width="14"
          height="14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div
        className={`filter-panel-wrap ${showFilters ? "filter-panel-wrap--open" : ""}`}
      >
        <FilterPanel
          onFiltersChange={setFilters}
          searchActive={query.length > 0}
        />
      </div>

      <SearchResultsList
        movies={movies}
        isLoading={isLoading}
        hasSearched={hasSearched}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onMovieClick={handleMovieClick}
      />
    </section>
  );
}

export default App;
