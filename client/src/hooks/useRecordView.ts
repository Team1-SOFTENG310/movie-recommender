import { useContext, useEffect } from "react";
import { recordView } from "../api/history";
import { AuthContext } from "../context/AuthContext";

/**
 * Adds a movie to the logged-in user's viewing history once it's on screen.
 * Does nothing for logged-out visitors, or where no AuthProvider is mounted.
 * Failures are ignored: history is a convenience and must never break the page.
 */
export function useRecordView(movieId: number | null) {
  const isAuthenticated = useContext(AuthContext)?.isAuthenticated ?? false;

  useEffect(() => {
    if (movieId === null || !isAuthenticated) {
      return;
    }
    recordView(movieId).catch(() => undefined);
  }, [movieId, isAuthenticated]);
}
