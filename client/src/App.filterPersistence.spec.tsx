import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, it, expect } from "vitest";
import App from "./App";
import MovieDetail from "./pages/MovieDetail";
import { AuthProvider } from "./context/AuthProvider";

function savedFilters(): unknown {
  return JSON.parse(sessionStorage.getItem("movieSearchFilters") ?? "null");
}

describe("App filter persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("restores saved filters into the filter panel", () => {
    sessionStorage.setItem(
      "movieSearchFilters",
      JSON.stringify({ genre: 28, ratingMin: 5, sort: "rating" }),
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/genre/i)).toHaveValue("28");
    expect(screen.getByLabelText(/minimum rating/i)).toHaveValue("5");
    expect(screen.getByLabelText(/sort by/i)).toHaveValue("rating");
    // The panel's first emit must not overwrite what was saved.
    expect(savedFilters()).toMatchObject({ genre: 28, ratingMin: 5, sort: "rating" });
  });

  it("keeps the selected genre after visiting a movie and going back", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Link to="/movie/574475">Open movie</Link>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.selectOptions(screen.getByLabelText(/genre/i), "28");
    await user.click(screen.getByText("Open movie"));
    await user.click(await screen.findByText(/← Back to Search/i));

    expect(screen.getByLabelText(/genre/i)).toHaveValue("28");
    expect(savedFilters()).toMatchObject({ genre: 28 });
  });
});
