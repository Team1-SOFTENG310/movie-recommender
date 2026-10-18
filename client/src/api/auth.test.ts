import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { getCurrentUser, requestLogin, requestLogout, requestSignup } from "./auth";
import { apiFetch } from "./index";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const testUser = {
  id: "user-1",
  username: "film_fan",
  email: "film@example.com",
};

describe("authentication API", () => {
  it("fetches the current user with browser credentials", async () => {
    let credentials: RequestCredentials | undefined;

    server.use(
      http.get(`${BASE_URL}/auth/me`, ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ user: testUser });
      }),
    );

    await expect(getCurrentUser()).resolves.toEqual(testUser);
    expect(credentials).toBe("include");
  });

  it("returns null when the session response contains no user", async () => {
    server.use(
      http.get(`${BASE_URL}/auth/me`, () =>
        HttpResponse.json({ user: null }),
      ),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("propagates session request failures", async () => {
    server.use(
      http.get(`${BASE_URL}/auth/me`, () =>
        HttpResponse.json(
          { message: "Session unavailable" },
          { status: 503 },
        ),
      ),
    );

    await expect(getCurrentUser()).rejects.toThrow(
      "Session unavailable",
    );
  });

  it("logs out using POST with browser credentials", async () => {
    let credentials: RequestCredentials | undefined;

    server.use(
      http.post(`${BASE_URL}/auth/logout`, ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ message: "Logged out" });
      }),
    );

    await expect(requestLogout()).resolves.toBeUndefined();
    expect(credentials).toBe("include");
  });

  it("accepts an empty 204 logout response", async () => {
    server.use(
      http.post(
        `${BASE_URL}/auth/logout`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(requestLogout()).resolves.toBeUndefined();
  });

  it("propagates logout failures", async () => {
    server.use(
      http.post(`${BASE_URL}/auth/logout`, () =>
        HttpResponse.json(
          { message: "Could not log out" },
          { status: 500 },
        ),
      ),
    );

    await expect(requestLogout()).rejects.toThrow(
      "Could not log out",
    );
  });
});

describe("shared API helper", () => {
  it("uses the HTTP status when an error response is not JSON", async () => {
    server.use(
      http.get(
        `${BASE_URL}/test-error`,
        () => new HttpResponse("Unavailable", { status: 503 }),
      ),
    );

    await expect(apiFetch("/test-error")).rejects.toThrow(
      "HTTP 503",
    );
  });

  it("preserves request options, custom headers, and the JSON body", async () => {
    let credentials: RequestCredentials | undefined;
    let customHeader: string | null = null;
    let contentType: string | null = null;
    let body: unknown;

    server.use(
      http.post(`${BASE_URL}/test-options`, async ({ request }) => {
        credentials = request.credentials;
        customHeader = request.headers.get("X-Test");
        contentType = request.headers.get("Content-Type");
        body = await request.json();

        return HttpResponse.json({ saved: true });
      }),
    );

    const result = await apiFetch<{ saved: boolean }>("/test-options", {
      method: "POST",
      credentials: "omit",
      headers: new Headers({ "X-Test": "example" }),
      body: JSON.stringify({ value: 42 }),
    });

    expect(result).toEqual({ saved: true });
    expect(credentials).toBe("omit");
    expect(customHeader).toBe("example");
    expect(contentType).toBe("application/json");
    expect(body).toEqual({ value: 42 });
  });
});

describe("login API", () => {
  it("sends login details and includes browser credentials", async () => {
    let receivedBody: unknown;
    let credentials: RequestCredentials | undefined;
    let contentType: string | null = null;

    server.use(
      http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
        receivedBody = await request.json();
        credentials = request.credentials;
        contentType = request.headers.get("Content-Type");

        return HttpResponse.json({ user: testUser });
      }),
    );

    await expect(
      requestLogin({
        identifier: "film_fan",
        password: "example-password",
      }),
    ).resolves.toEqual(testUser);

    expect(receivedBody).toEqual({
      identifier: "film_fan",
      password: "example-password",
    });
    expect(credentials).toBe("include");
    expect(contentType).toBe("application/json");
  });

  it("propagates invalid-credentials errors", async () => {
    server.use(
      http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json(
          { message: "Invalid username/email or password" },
          { status: 401 },
        ),
      ),
    );

    await expect(
      requestLogin({
        identifier: "film_fan",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid username/email or password");
  });

  it("propagates database-unavailable errors", async () => {
    server.use(
      http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json(
          { message: "Authentication is unavailable" },
          { status: 503 },
        ),
      ),
    );

    await expect(
      requestLogin({
        identifier: "film_fan",
        password: "example-password",
      }),
    ).rejects.toThrow("Authentication is unavailable");
  });
});

describe("signup API", () => {
  it("sends account details with browser credentials", async () => {
    let receivedBody: unknown;
    let credentials: RequestCredentials | undefined;

    server.use(
      http.post(`${BASE_URL}/auth/signup`, async ({ request }) => {
        receivedBody = await request.json();
        credentials = request.credentials;

        return HttpResponse.json({ user: testUser }, { status: 201 });
      }),
    );

    await expect(
      requestSignup({
        username: "film_fan",
        email: "film@example.com",
        password: "example-password",
      }),
    ).resolves.toEqual(testUser);

    expect(receivedBody).toEqual({
      username: "film_fan",
      email: "film@example.com",
      password: "example-password",
    });
    expect(credentials).toBe("include");
  });

  it("propagates duplicate-account errors", async () => {
    server.use(
      http.post(`${BASE_URL}/auth/signup`, () =>
        HttpResponse.json(
          { message: "Username or email is already registered" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      requestSignup({
        username: "film_fan",
        email: "film@example.com",
        password: "example-password",
      }),
    ).rejects.toThrow("Username or email is already registered");
  });
});