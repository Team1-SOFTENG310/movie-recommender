import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";
import { server } from "../test/server";
import { apiFetch } from "./index";

const ENDPOINT = "http://localhost:5000/api/test";

describe("apiFetch", () => {
  it("returns the JSON body of a successful response", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: 7 })));

    await expect(apiFetch<{ id: number }>("/test")).resolves.toEqual({ id: 7 });
  });

  it("does not add a content type without a body and keeps caller headers", async () => {
    let received: Headers | undefined;
    server.use(
      http.get(ENDPOINT, ({ request }) => {
        received = request.headers;
        return HttpResponse.json({});
      }),
    );

    await apiFetch("/test", { headers: new Headers({ "X-Request-Id": "abc" }) });

    expect(received?.get("Content-Type")).toBeNull();
    expect(received?.get("X-Request-Id")).toBe("abc");
  });

  it("adds a JSON content type when a body is provided", async () => {
    let received: Headers | undefined;

    server.use(
      http.post(ENDPOINT, ({ request }) => {
        received = request.headers;
        return HttpResponse.json({});
      }),
    );

    await apiFetch("/test", {
      method: "POST",
      body: JSON.stringify({ example: "value" }),
    });

    expect(received?.get("Content-Type")).toBe("application/json");
  });

  it("preserves an explicitly provided content type", async () => {
    let received: Headers | undefined;

    server.use(
      http.post(ENDPOINT, ({ request }) => {
        received = request.headers;
        return HttpResponse.json({});
      }),
    );

    await apiFetch("/test", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "Example text",
    });

    expect(received?.get("Content-Type")).toBe("text/plain");
  });

  it("throws the backend's error message", async () => {
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json({ message: "Service down" }, { status: 503 })),
    );

    await expect(apiFetch("/test")).rejects.toThrow("Service down");
  });

  it("falls back to the status when the error body has no message", async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse("oops", { status: 500 })));

    await expect(apiFetch("/test")).rejects.toThrow("HTTP 500");
  });
});
