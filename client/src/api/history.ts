import { apiFetch } from "./index";

/** One movie in the logged-in user's viewing history (server/src/controllers/history.controller.ts). */
export interface ViewedMovie {
  movieId: number;
  viewedAt: string;
}

/** One page of history; `totalPages` is 0 when the user hasn't viewed anything. */
export interface HistoryPage {
  history: ViewedMovie[];
  page: number;
  totalPages: number;
}

/** A page of the user's viewed movies, newest first. Needs a logged-in session. */
export async function fetchHistory(page = 1, signal?: AbortSignal): Promise<HistoryPage> {
  return apiFetch<HistoryPage>(`/users/me/history?page=${page}`, { signal });
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
