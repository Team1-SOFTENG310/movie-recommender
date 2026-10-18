import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../context/AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { server } from "../test/server";
import Signup from "./Signup";

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

function renderSignup() {
  server.use(
    http.get(`${BASE_URL}/auth/me`, () =>
      HttpResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      ),
    ),
  );

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<h1>Login page</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillForm(password: string, confirmation: string) {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText("Username"), "film_fan");
  await user.type(screen.getByLabelText("Email"), "film@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirmation);

  return user;
}

describe("Signup", () => {
  it("creates an account and updates authentication state", async () => {
    let receivedBody: unknown;

    server.use(
      http.post(`${BASE_URL}/auth/signup`, async ({ request }) => {
        receivedBody = await request.json();

        return HttpResponse.json({ user: testUser }, { status: 201 });
      }),
    );

    renderSignup();
    const user = await fillForm("example-password", "example-password");

    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome film_fan" }),
    ).toBeInTheDocument();

    expect(receivedBody).toEqual({
      username: "film_fan",
      email: "film@example.com",
      password: "example-password",
    });
  });

  it.each([
    {
        scenario: "passwords that do not match",
        password: "example-password",
        confirmation: "different-password",
        expectedMessage: "Passwords do not match.",
    },
    {
        scenario: "short passwords",
        password: "short",
        confirmation: "short",
        expectedMessage: "Password must be at least 8 characters",
    },
    ])(
    "rejects $scenario without submitting",
    async ({ password, confirmation, expectedMessage }) => {
        let signupRequests = 0;

        server.use(
        http.post(`${BASE_URL}/auth/signup`, () => {
            signupRequests += 1;
            return HttpResponse.json({ user: testUser }, { status: 201 });
        }),
        );

        renderSignup();

        const user = await fillForm(password, confirmation);
        await user.click(screen.getByRole("button", { name: "Register" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
        expectedMessage,
        );
        expect(signupRequests).toBe(0);
    },);

  it("shows duplicate-account errors and allows another attempt", async () => {
    server.use(
      http.post(`${BASE_URL}/auth/signup`, () =>
        HttpResponse.json(
          { message: "Username or email is already registered" },
          { status: 409 },
        ),
      ),
    );

    renderSignup();
    const user = await fillForm("example-password", "example-password");

    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Username or email is already registered",
    );
    expect(
      screen.getByRole("button", { name: "Register" }),
    ).toBeEnabled();
  });

  it("links to the login page", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(await screen.findByRole("link", { name: "Log in" }));

    expect(
      await screen.findByRole("heading", { name: "Login page" }),
    ).toBeInTheDocument();
  });
});