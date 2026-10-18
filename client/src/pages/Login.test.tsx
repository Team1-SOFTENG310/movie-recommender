import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../context/AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { server } from "../test/server";
import Login from "./Login";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const testUser = {
  id: "user-1",
  username: "film_fan",
  email: "film@example.com",
};

function Home() {
  const { user } = useAuth();

  return <h1>Welcome {user?.username ?? "guest"}</h1>;
}

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function useLoggedOutSession() {
  server.use(
    http.get(`${BASE_URL}/auth/me`, () =>
      HttpResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      ),
    ),
  );
}

describe("Login", () => {
  it("shows a loading message while checking the session", async () => {
    let finishSessionCheck!: () => void;
    const sessionPending = new Promise<void>((resolve) => {
      finishSessionCheck = resolve;
    });

    server.use(
      http.get(`${BASE_URL}/auth/me`, async () => {
        await sessionPending;

        return HttpResponse.json(
          { message: "Not authenticated" },
          { status: 401 },
        );
      }),
    );

    renderLogin();

    try {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Checking your session",
      );
      expect(
        screen.queryByRole("button", { name: "Log in" }),
      ).not.toBeInTheDocument();
    } finally {
      finishSessionCheck();
    }

    expect(
      await screen.findByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("renders the login form when logged out", async () => {
    useLoggedOutSession();
    renderLogin();

    expect(
      await screen.findByLabelText("Username or email"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("updates authentication state and navigates home after login", async () => {
    const user = userEvent.setup();
    let receivedBody: unknown;

    useLoggedOutSession();
    server.use(
      http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
        receivedBody = await request.json();

        return HttpResponse.json({ user: testUser });
      }),
    );

    renderLogin();

    await user.type(
      await screen.findByLabelText("Username or email"),
      "film_fan",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "example-password",
    );
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByRole("heading", {
        name: "Welcome film_fan",
      }),
    ).toBeInTheDocument();

    expect(receivedBody).toEqual({
      identifier: "film_fan",
      password: "example-password",
    });
  });

  it("shows an error and allows another attempt after rejected login", async () => {
    const user = userEvent.setup();

    useLoggedOutSession();
    server.use(
      http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json(
          { message: "Invalid username/email or password" },
          { status: 401 },
        ),
      ),
    );

    renderLogin();

    await user.type(
      await screen.findByLabelText("Username or email"),
      "film_fan",
    );
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username/email or password",
    );
    expect(
      screen.getByRole("button", { name: "Log in" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Username or email")).toHaveValue(
      "film_fan",
    );
  });

  it("disables the form while login is pending", async () => {
    const user = userEvent.setup();
    let finishLogin!: () => void;
    const loginPending = new Promise<void>((resolve) => {
      finishLogin = resolve;
    });

    useLoggedOutSession();
    server.use(
      http.post(`${BASE_URL}/auth/login`, async () => {
        await loginPending;

        return HttpResponse.json({ user: testUser });
      }),
    );

    renderLogin();

    await user.type(
      await screen.findByLabelText("Username or email"),
      "film_fan",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "example-password",
    );

    try {
      await user.click(screen.getByRole("button", { name: "Log in" }));

      expect(
        screen.getByRole("button", { name: "Logging in…" }),
      ).toBeDisabled();
      expect(screen.getByLabelText("Username or email")).toBeDisabled();
      expect(screen.getByLabelText("Password")).toBeDisabled();
    } finally {
      finishLogin();
    }

    await screen.findByRole("heading", { name: "Welcome film_fan" });
  });

  it("does not submit a whitespace-only identifier", async () => {
    const user = userEvent.setup();
    let loginRequests = 0;

    useLoggedOutSession();
    server.use(
      http.post(`${BASE_URL}/auth/login`, () => {
        loginRequests += 1;

        return HttpResponse.json({ user: testUser });
      }),
    );

    renderLogin();

    await user.type(
      await screen.findByLabelText("Username or email"),
      "   ",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "example-password",
    );
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter your username or email and password.",
    );
    expect(loginRequests).toBe(0);
  });

  it("redirects an already authenticated user home", async () => {
    server.use(
      http.get(`${BASE_URL}/auth/me`, () =>
        HttpResponse.json({ user: testUser }),
      ),
    );

    renderLogin();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Welcome film_fan" }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "Log in" }),
    ).not.toBeInTheDocument();
  });
});