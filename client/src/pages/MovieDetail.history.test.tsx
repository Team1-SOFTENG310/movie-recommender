import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../context/AuthContext";
import { fetchMovieDetails } from "../api/movieDetails";
import { recordViewedMovie } from "../api/viewingHistory";
import type { TmdbMovieDetails } from "../types/tmdb";
import MovieDetail from "./MovieDetail";

vi.mock("../api/movieDetails", () => ({
  fetchMovieDetails:
    vi.fn<
      (
        movieId: string | number,
        signal?: AbortSignal,
      ) => Promise<TmdbMovieDetails>
    >(),
}));

vi.mock("../api/viewingHistory", () => ({
  recordViewedMovie:
    vi.fn<
      (
        movie: {
          movieId: number;
          title: string;
          posterPath: string | null;
          releaseDate: string | null;
        },
      ) => Promise<void>
    >(),
}));

// These components have their own tests. Keep this suite focused
// on MovieDetail's recording behaviour.
vi.mock("../components/MovieRecommendations", () => ({
  default: () => null,
}));

vi.mock("../components/MovieGraph", () => ({
  default: () => null,
}));

vi.mock("../components/ReviewsList", () => ({
  default: () => null,
}));

const account = {
  id: "user-1",
  username: "film_fan",
  email: "film@example.com",
};

const movie: TmdbMovieDetails = {
  id: 574475,
  title: "History Test Movie",
  overview: "A movie used for recording tests.",
  poster_path: null,
  release_date: "2025-05-14",
  runtime: 110,
  vote_average: 7,
  genres: [],
  credits: {
    cast: [],
  },
};

function movieTree(
  currentUser: typeof account | null = account,
) {
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
              element={<MovieDetail />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </StrictMode>
  );
}

describe("MovieDetail recording regression tests", () => {
  beforeEach(() => {
    vi.mocked(fetchMovieDetails)
      .mockReset()
      .mockResolvedValue(movie);

    vi.mocked(recordViewedMovie)
      .mockReset()
      .mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records a missing release date as null", async () => {
    vi.mocked(fetchMovieDetails).mockResolvedValue({
      ...movie,
      release_date: "",
    });

    render(movieTree());

    await waitFor(() => {
      expect(recordViewedMovie).toHaveBeenCalledWith({
        movieId: 574475,
        title: "History Test Movie",
        posterPath: null,
        releaseDate: null,
      });
    });
  });

  it("does not record a logged-out visit", async () => {
    render(movieTree(null));

    await screen.findByRole("heading", {
      name: "History Test Movie",
    });

    expect(recordViewedMovie).not.toHaveBeenCalled();
  });

  it("does not record a movie whose details fail to load", async () => {
    vi.mocked(fetchMovieDetails).mockRejectedValue(
      new Error("Movie not found"),
    );

    render(movieTree());

    await screen.findByText("Movie not found");

    expect(recordViewedMovie).not.toHaveBeenCalled();
  });

  it("records only once across Strict Mode and rerenders", async () => {
    const view = render(movieTree());

    await screen.findByRole("heading", {
      name: "History Test Movie",
    });

    await waitFor(() => {
      expect(recordViewedMovie).toHaveBeenCalledTimes(1);
    });

    view.rerender(movieTree());

    expect(recordViewedMovie).toHaveBeenCalledTimes(1);
  });

  it("keeps movie details visible when recording fails", async () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    vi.mocked(recordViewedMovie).mockRejectedValue(
      new Error("HTTP 503"),
    );

    render(movieTree());

    await waitFor(() => {
      expect(warning).toHaveBeenCalledWith(
        "Unable to save this movie to viewing history.",
      );
    });

    expect(
      screen.getByRole("heading", {
        name: "History Test Movie",
      }),
    ).toBeInTheDocument();

    expect(recordViewedMovie).toHaveBeenCalledTimes(1);
  });
});
