import { apiFetch } from "./index";

/** One movie in the logged-in user's viewing history (server/src/controllers/history.controller.ts). */
export interface ViewedMovie {
  movieId: number;
  viewedAt: string;
}

interface HistoryResponse {
  history: ViewedMovie[];
}

/** The user's recently viewed movies, newest first. Needs a logged-in session. */
export async function fetchHistory(signal?: AbortSignal): Promise<ViewedMovie[]> {
  const response = await apiFetch<HistoryResponse>("/users/me/history", { signal });
  return response.history;
}

/** Records that the logged-in user opened a movie. */
export async function recordView(movieId: number): Promise<void> {
  await apiFetch<ViewedMovie>("/users/me/history", {
    method: "POST",
    body: JSON.stringify({ movieId }),
  });
}

/** Deletes the logged-in user's whole viewing history. */
export async function clearHistory(): Promise<void> {
  await apiFetch<void>("/users/me/history", { method: "DELETE" });
}
