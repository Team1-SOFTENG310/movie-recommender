import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";
import { fetchMovieDetails } from "../api/movieDetails";
import { recordView } from "../api/history";
import type { TmdbMovieDetails } from "../types/tmdb";
import MovieDetail from "./MovieDetail";

vi.mock("../api/movieDetails", () => ({
  MOVIE_NOT_FOUND: "Movie not found",
  fetchMovieDetails: vi.fn<(movieId: string | number, signal?: AbortSignal) => Promise<TmdbMovieDetails>>(),
}));

vi.mock("../api/history", () => ({
  recordView: vi.fn<(movieId: number) => Promise<void>>(),
}));

// These have their own tests; this suite is about recording the view.
vi.mock("../components/MovieRecommendations", () => ({ default: () => null }));
vi.mock("../components/MovieGraph", () => ({ default: () => null }));
vi.mock("../components/ReviewsList", () => ({ default: () => null }));

const account = { id: "user-1", username: "film_fan", email: "film@example.com" };

const movie: TmdbMovieDetails = {
  id: 574475,
  title: "History Test Movie",
  overview: "A movie used for recording tests.",
  poster_path: null,
  release_date: "2025-05-14",
  runtime: 110,
  vote_average: 7,
  genres: [],
  credits: { cast: [] },
};

function movieTree(currentUser: typeof account | null = account) {
  const value: AuthContextValue = {
    user: currentUser,
    isAuthenticated: currentUser !== null,
    isLoading: false,
    setUser: vi.fn<AuthContextValue["setUser"]>(),
    logout: vi.fn<AuthContextValue["logout"]>(),
  };

  return (
    <StrictMode>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={["/movie/574475"]}>
          <Routes>
            <Route
              path="/movie/:id"
              element={
                <>
                  <MovieDetail />
                  <Link to="/elsewhere">Elsewhere</Link>
                </>
              }
            />
            <Route path="/elsewhere" element={<Link to="/movie/574475">Back to the movie</Link>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </StrictMode>
  );
}

describe("MovieDetail viewing history", () => {
  beforeEach(() => {
    vi.mocked(fetchMovieDetails).mockReset().mockResolvedValue(movie);
    vi.mocked(recordView).mockReset().mockResolvedValue();
  });

  it("records only once across Strict Mode and re-renders", async () => {
    const view = render(movieTree());

    await screen.findByRole("heading", { name: "History Test Movie" });
    await waitFor(() => expect(recordView).toHaveBeenCalledTimes(1));

    view.rerender(movieTree());

    expect(recordView).toHaveBeenCalledTimes(1);
    expect(recordView).toHaveBeenCalledWith(574475);
  });

  it("records the movie again when the user comes back to it", async () => {
    const user = userEvent.setup();
    render(movieTree());

    await screen.findByRole("heading", { name: "History Test Movie" });
    await waitFor(() => expect(recordView).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("link", { name: "Elsewhere" }));
    await user.click(screen.getByRole("link", { name: "Back to the movie" }));

    await screen.findByRole("heading", { name: "History Test Movie" });
    await waitFor(() => expect(recordView).toHaveBeenCalledTimes(2));
  });

  it("does not record a logged-out visit", async () => {
    render(movieTree(null));

    await screen.findByRole("heading", { name: "History Test Movie" });

    expect(recordView).not.toHaveBeenCalled();
  });

  it("does not record a movie whose details fail to load", async () => {
    vi.mocked(fetchMovieDetails).mockRejectedValue(new Error("Movie not found"));

    render(movieTree());

    await screen.findByText("Movie not found");

    expect(recordView).not.toHaveBeenCalled();
  });

  it("keeps the movie details on screen when recording fails", async () => {
    vi.mocked(recordView).mockRejectedValue(new Error("HTTP 503"));

    render(movieTree());

    await waitFor(() => expect(recordView).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("heading", { name: "History Test Movie" })).toBeInTheDocument();
  });
});
