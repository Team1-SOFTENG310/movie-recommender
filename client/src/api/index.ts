const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function messageFromErrorBody(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  // Only set Content-Type when a body is present and the header isn't already set
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: options.credentials ?? "include",
    headers,
  });
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null);

      throw new Error(
        messageFromErrorBody(body) || `HTTP ${res.status}`,
      );
    }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
