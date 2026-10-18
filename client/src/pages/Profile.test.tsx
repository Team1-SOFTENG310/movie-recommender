import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../context/AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { server } from "../test/server";
import Profile from "./Profile";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const testUser = {
  id: "user-1",
  username: "film_fan",
  email: "film@example.com",
};

function MovieHome() {
  const { user } = useAuth();

  return (
    <>
      <h1>Movie search</h1>
      <p>{user ? `Hello, ${user.username}` : "Logged out"}</p>
    </>
  );
}

function renderProfile() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route path="/" element={<MovieHome />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function useAuthenticatedSession() {
  server.use(
    http.get(`${BASE_URL}/auth/me`, () =>
      HttpResponse.json({ user: testUser }),
    ),
  );
}

/** Serves this viewing history, and a TMDB entry "Movie <id>" (released 2000 + id) for each movie. */
function useHistory(history: { movieId: number; viewedAt: string }[]) {
  server.use(
    http.get(`${BASE_URL}/users/me/history`, () => HttpResponse.json({ history })),
    http.get("https://api.themoviedb.org/3/movie/:id", ({ params }) => {
      const id = Number(params.id);
      if (id === 404) {
        return HttpResponse.json({ status_message: "Not found" }, { status: 404 });
      }
      return HttpResponse.json({
        id,
        title: `Movie ${id}`,
        overview: null,
        poster_path: null,
        release_date: `${2000 + id}-01-01`,
        runtime: null,
        vote_average: null,
        genres: [],
      });
    }),
  );
}

async function waitForProfile() {
  return screen.findByRole("heading", { name: "Your profile" });
}

describe("Profile", () => {
  it("displays the authenticated user's account information", async () => {
    useAuthenticatedSession();
    renderProfile();

    await waitForProfile();

    expect(screen.getByText(testUser.username)).toBeInTheDocument();
    expect(screen.getByText(testUser.email)).toBeInTheDocument();

    expect(
      screen.getByRole("region", { name: "Account details" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", { name: "Login page" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      scenario: "the user is logged out",
      status: 401,
      message: "Not authenticated",
    },
    {
      scenario: "the session lookup fails",
      status: 503,
      message: "Session unavailable",
    },
  ])(
    "redirects to login when $scenario",
    async ({ status, message }) => {
      server.use(
        http.get(`${BASE_URL}/auth/me`, () =>
          HttpResponse.json({ message }, { status }),
        ),
      );

      renderProfile();

      expect(
        await screen.findByRole("heading", { name: "Login page" }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole("heading", { name: "Your profile" }),
      ).not.toBeInTheDocument();

      expect(screen.queryByText(testUser.email)).not.toBeInTheDocument();
    },
  );

  it("waits for session restoration before redirecting or showing details", async () => {
    let finishSessionCheck!: () => void;

    const sessionPending = new Promise<void>((resolve) => {
      finishSessionCheck = resolve;
    });

    server.use(
      http.get(`${BASE_URL}/auth/me`, async () => {
        await sessionPending;
        return HttpResponse.json({ user: testUser });
      }),
    );

    renderProfile();

    try {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading your profile",
      );

      expect(
        screen.queryByRole("heading", { name: "Login page" }),
      ).not.toBeInTheDocument();

      expect(screen.queryByText(testUser.email)).not.toBeInTheDocument();
    } finally {
      finishSessionCheck();
    }

    await waitForProfile();

    expect(screen.getByText(testUser.email)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an empty viewing history with a link back to the movies", async () => {
    useAuthenticatedSession();
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });

    expect(await within(history).findByText(/Movies you open will appear here/)).toBeInTheDocument();
    expect(within(history).getByRole("link", { name: "Find something to watch" })).toHaveAttribute("href", "/");
  });

  it("lists recently viewed movies, newest first, linking to each one", async () => {
    useAuthenticatedSession();
    useHistory([
      { movieId: 2, viewedAt: "2026-10-19T10:00:00.000Z" },
      { movieId: 1, viewedAt: "2026-10-18T10:00:00.000Z" },
    ]);
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });
    const links = await within(history).findAllByRole("link", { name: /Movie \d/ });

    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/movie/2", "/movie/1"]);
    expect(links[0]).toHaveTextContent("Movie 2");
    expect(links[0]).toHaveTextContent("2002");
  });

  it("skips a viewed movie TMDB can no longer find", async () => {
    useAuthenticatedSession();
    useHistory([
      { movieId: 2, viewedAt: "2026-10-19T10:00:00.000Z" },
      { movieId: 404, viewedAt: "2026-10-18T10:00:00.000Z" },
    ]);
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });

    expect(await within(history).findAllByRole("link", { name: /Movie \d/ })).toHaveLength(1);
  });

  it("clears the viewing history after confirmation", async () => {
    const user = userEvent.setup();
    let cleared = false;
    useAuthenticatedSession();
    useHistory([{ movieId: 2, viewedAt: "2026-10-19T10:00:00.000Z" }]);
    server.use(
      http.delete(`${BASE_URL}/users/me/history`, () => {
        cleared = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });
    await within(history).findByRole("link", { name: /Movie 2/ });

    await user.click(within(history).getByRole("button", { name: "Clear history…" }));
    expect(cleared).toBe(false);
    await user.click(within(history).getByRole("button", { name: "Clear history" }));

    expect(cleared).toBe(true);
    expect(await within(history).findByText(/Movies you open will appear here/)).toBeInTheDocument();
  });

  it("can cancel clearing the viewing history", async () => {
    const user = userEvent.setup();
    useAuthenticatedSession();
    useHistory([{ movieId: 2, viewedAt: "2026-10-19T10:00:00.000Z" }]);
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });
    await within(history).findByRole("link", { name: /Movie 2/ });

    await user.click(within(history).getByRole("button", { name: "Clear history…" }));
    await user.click(within(history).getByRole("button", { name: "Cancel" }));

    expect(within(history).getByRole("link", { name: /Movie 2/ })).toBeInTheDocument();
    expect(within(history).getByRole("button", { name: "Clear history…" })).toBeInTheDocument();
  });

  it("shows an error with a working retry when the history can't load", async () => {
    const user = userEvent.setup();
    let fail = true;
    useAuthenticatedSession();
    server.use(
      http.get(`${BASE_URL}/users/me/history`, () =>
        fail
          ? HttpResponse.json({ message: "Account service is unavailable" }, { status: 503 })
          : HttpResponse.json({ history: [{ movieId: 2, viewedAt: "2026-10-19T10:00:00.000Z" }] }),
      ),
    );
    renderProfile();

    await waitForProfile();
    const history = screen.getByRole("region", { name: "Viewing history" });
    expect(await within(history).findByRole("alert")).toHaveTextContent("Couldn't load your viewing history.");

    fail = false;
    await user.click(within(history).getByRole("button", { name: "Try again" }));

    // Title from the default TMDB mock in test/handlers.ts
    expect(await within(history).findByRole("link", { name: /Final Destination Bloodlines/ })).toBeInTheDocument();
  });

  it("returns to movies without logging out when Back to movies is clicked", async () => {
    const user = userEvent.setup();

    useAuthenticatedSession();
    renderProfile();

    await user.click(
      await screen.findByRole("link", { name: /back to movies/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Movie search" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Hello, film_fan")).toBeInTheDocument();
  });

  it("logs out and returns to movies instead of the login page", async () => {
    const user = userEvent.setup();
    let logoutRequests = 0;

    useAuthenticatedSession();

    server.use(
      http.post(`${BASE_URL}/auth/logout`, () => {
        logoutRequests += 1;
        return HttpResponse.json({ message: "Logged out" });
      }),
    );

    renderProfile();
    await waitForProfile();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", { name: "Movie search" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Logged out")).toBeInTheDocument();
    expect(logoutRequests).toBe(1);

    expect(
      screen.queryByRole("heading", { name: "Login page" }),
    ).not.toBeInTheDocument();
  });

  it("disables logout while the request is pending", async () => {
    const user = userEvent.setup();
    let finishLogout!: () => void;
    let logoutRequests = 0;

    const logoutPending = new Promise<void>((resolve) => {
      finishLogout = resolve;
    });

    useAuthenticatedSession();

    server.use(
      http.post(`${BASE_URL}/auth/logout`, async () => {
        logoutRequests += 1;
        await logoutPending;

        return HttpResponse.json({ message: "Logged out" });
      }),
    );

    renderProfile();
    await waitForProfile();

    try {
      await user.click(screen.getByRole("button", { name: "Log out" }));

      const pendingButton = screen.getByRole("button", {
        name: "Logging out…",
      });

      expect(pendingButton).toBeDisabled();

      await user.click(pendingButton);
    } finally {
      finishLogout();
    }

    await screen.findByRole("heading", { name: "Movie search" });
    expect(logoutRequests).toBe(1);
  });

  it("shows a logout error, keeps the user logged in, and allows retry", async () => {
    const user = userEvent.setup();
    let logoutRequests = 0;

    useAuthenticatedSession();

    server.use(
      http.post(`${BASE_URL}/auth/logout`, () => {
        logoutRequests += 1;

        if (logoutRequests === 1) {
          return HttpResponse.json(
            { message: "Could not log out" },
            { status: 500 },
          );
        }

        return HttpResponse.json({ message: "Logged out" });
      }),
    );

    renderProfile();
    await waitForProfile();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to log out. Please try again.",
    );

    expect(screen.getByText(testUser.email)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", { name: "Movie search" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Logged out")).toBeInTheDocument();
    expect(logoutRequests).toBe(2);
  });
});
