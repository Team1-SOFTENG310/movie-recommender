import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import RandomButton from "./RandomButton";

// ─── MSW server setup ─────────────────────────────────────────
const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <RandomButton />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/movie/:id" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RandomButton", () => {
  it("opens dropdown with genre / language / rating filters", () => {
    renderWithRouter();

    expect(screen.queryByLabelText(/Genre/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Want a random movie/i));
    expect(screen.getByLabelText(/Genre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Min Rating/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate/i)).toBeInTheDocument();
  });

  it("navigates to a random movie when a match is found", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () => {
        return HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 2,
          results: [
            { id: 111, title: "Movie A", release_date: "2020-01-01", poster_path: null, overview: "", genre_ids: [], vote_average: 8 },
            { id: 222, title: "Movie B", release_date: "2021-01-01", poster_path: null, overview: "", genre_ids: [], vote_average: 7 },
          ],
        });
      })
    );

    renderWithRouter();

    fireEvent.click(screen.getByText(/Want a random movie/i));
    fireEvent.click(screen.getByText(/Generate/i));

    await waitFor(() => {
      const loc = screen.getByTestId("location-display").textContent;
      expect(loc === "/movie/111" || loc === "/movie/222").toBe(true);
    });
  });

  it("shows a toast when no movie matches", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () => {
        return HttpResponse.json({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [],
        });
      })
    );

    renderWithRouter();

    fireEvent.click(screen.getByText(/Want a random movie/i));
    fireEvent.click(screen.getByText(/Generate/i));

    await waitFor(() => {
      expect(
        screen.getByText(/No movie found matching your criteria/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("location-display")).toHaveTextContent("/");
  });

  it("auto-dismisses the toast after 10 seconds", async () => {
    vi.useFakeTimers();

    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () => {
        return HttpResponse.json({ page: 1, total_pages: 0, total_results: 0, results: [] });
      })
    );

    renderWithRouter();

    fireEvent.click(screen.getByText(/Want a random movie/i));
    fireEvent.click(screen.getByText(/Generate/i));

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText(/No movie found matching your criteria/i)
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(
      screen.queryByText(/No movie found matching your criteria/i)
    ).not.toBeInTheDocument();
  });

  it("can be closed manually via the x button", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () => {
        return HttpResponse.json({ page: 1, total_pages: 0, total_results: 0, results: [] });
      })
    );

    renderWithRouter();

    fireEvent.click(screen.getByText(/Want a random movie/i));
    fireEvent.click(screen.getByText(/Generate/i));

    // 等 Toast 出现
    const toast = await screen.findByText(/No movie found matching your criteria/i);
    expect(toast).toBeInTheDocument();

    // 点关闭按钮
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    // Toast 消失
    expect(
      screen.queryByText(/No movie found matching your criteria/i)
    ).not.toBeInTheDocument();
  });

  it("shows toast when API returns an error", async () => {
    server.use(
      http.get("https://api.themoviedb.org/3/discover/movie", () => {
        return HttpResponse.json({ message: "Service down" }, { status: 503 });
      })
    );

    renderWithRouter();

    fireEvent.click(screen.getByText(/Want a random movie/i));
    fireEvent.click(screen.getByText(/Generate/i));

    await waitFor(() => {
      expect(
        screen.getByText(/Server is having issues. Please try again in a moment./i)
      ).toBeInTheDocument();
    });
  });
});