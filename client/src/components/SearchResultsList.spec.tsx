import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchResultsList from "./SearchResultsList";
import { PLACEHOLDER_POSTER } from "../constants/images";
import type { Movie } from "../types/movie";

const movie: Movie = {
  id: 1,
  title: "No Poster Movie",
  year: 2001,
  posterUrl: null,
  overview: "",
  genreIds: [],
  voteAverage: null,
};

function renderList(props: Partial<Parameters<typeof SearchResultsList>[0]> = {}) {
  const handlers = { onLoadMore: vi.fn<() => void>(), onRetry: vi.fn<() => void>(), onMovieClick: vi.fn<(m: Movie) => void>() };
  render(
    <SearchResultsList
      movies={[]}
      isLoading={false}
      hasSearched
      hasMore={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("SearchResultsList", () => {
  it("explains a failed search and offers to retry it", async () => {
    const { onRetry } = renderList({ error: "Search failed with status 500" });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load movies");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps the loaded results when only the next page fails", () => {
    renderList({ movies: [movie], error: "Discover failed with status 500" });

    expect(screen.getByRole("button", { name: "View details for No Poster Movie" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load more movies");
  });

  it("suggests changing the title or filters when nothing matches", () => {
    renderList();

    expect(screen.getByText("No movies found. Try a different title or loosen your filters.")).toBeInTheDocument();
  });

  it("shows a placeholder for movies without a poster", () => {
    const { container } = render(
      <SearchResultsList movies={[movie]} isLoading={false} hasSearched hasMore={false} onLoadMore={vi.fn<() => void>()} onMovieClick={vi.fn<(m: Movie) => void>()} />,
    );

    expect(container.querySelector("img")).toHaveAttribute("src", PLACEHOLDER_POSTER);
  });
});
