import { act, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import App from "./App";
import MovieDetail from "./pages/MovieDetail";
import LocationDisplay from "./test/LocationDisplay";
import {
  RESULTS_FETCH_DEBOUNCE_MS,
  SEARCH_INPUT_DEBOUNCE_MS,
} from "./constants/debounce";
import { AuthProvider } from "./context/AuthProvider";

// A title search waits on two debounces (SearchBar, then useMovieResults),
// about 700ms in total. Waiting for those in real time left findBy*'s
// 1000ms timeout with little room, so the tests failed on slow or busy
// machines. Fake timers let each test skip past the debounces explicitly.
// shouldAdvanceTime keeps the fake clock moving with real time, so
// findBy*/waitFor still time out and report normally if something breaks.

function setupUser() {
  return userEvent.setup({
    advanceTimers: async (ms) => {
      await vi.advanceTimersByTimeAsync(ms);
    },
  });
}

// Each advance gets its own act() so React commits whatever the fired
// timer changed (and schedules any follow-up timer) before time moves on.
async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function searchFor(user: UserEvent, text: string) {
  await user.type(
    screen.getByRole("textbox", { name: /search movies/i }),
    text,
  );
  await advanceTimers(SEARCH_INPUT_DEBOUNCE_MS); // SearchBar sets App's query
  await advanceTimers(RESULTS_FETCH_DEBOUNCE_MS); // useMovieResults sends the request
}

function renderApp() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("App search integration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches through SearchBar and renders movie result", async () => {
    const user = setupUser();

    renderApp();

    await searchFor(user, "Test");

    expect(await screen.findByText("TestMovie1")).toBeInTheDocument();
  });

  it("shows discover results when filters are applied without a search query", async () => {
    const user = setupUser();

    renderApp();

    await user.selectOptions(screen.getByLabelText(/genre/i), "28");
    await advanceTimers(RESULTS_FETCH_DEBOUNCE_MS);

    expect(await screen.findByText("TestDiscoverMovie")).toBeInTheDocument();
  });

  it("disables the actor filter while a search query is active", async () => {
    const user = setupUser();

    renderApp();

    expect(screen.getByLabelText(/actor/i)).toBeEnabled();

    await user.type(
      screen.getByRole("textbox", { name: /search movies/i }),
      "Test",
    );
    await advanceTimers(SEARCH_INPUT_DEBOUNCE_MS);

    expect(screen.getByLabelText(/actor/i)).toBeDisabled();
  });

  it("applies genre filter on top of search results", async () => {
    const user = setupUser();

    renderApp();

    await searchFor(user, "Test");
    await screen.findByText("TestMovie1");

    // TestMovie1 has genre ids [1, 2, 3], so filtering to Action (28) removes it.
    await user.selectOptions(screen.getByLabelText(/genre/i), "28");
    await advanceTimers(RESULTS_FETCH_DEBOUNCE_MS);

    expect(await screen.findByText(/no movies found/i)).toBeInTheDocument();
    expect(screen.queryByText("TestMovie1")).not.toBeInTheDocument();
  });

  it("persists search query when navigating back from movie detail", async () => {
    const user = setupUser();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <LocationDisplay/>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await searchFor(user, "Test");

    await user.click(await screen.findByText("TestMovie1"));

    expect(
      await screen.findByText("Final Destination Bloodlines"),
    ).toBeInTheDocument();

    const backButton = screen.getByText(/← Back to Search/i);
    await user.click(backButton);

    expect(screen.getByTestId("location-display").textContent).toBe("/");

    const restoredInput = screen.getByRole("textbox", {
      name: /search movies/i,
    });
    expect(restoredInput).toHaveValue("Test");

    // The remounted search page fetches the restored query after its debounce.
    await advanceTimers(RESULTS_FETCH_DEBOUNCE_MS);
    expect(await screen.findByText("TestMovie1")).toBeInTheDocument();
  });
});
