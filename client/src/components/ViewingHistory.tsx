import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clearHistory, fetchHistory } from "../api/history";
import { fetchMovieSummary, type MovieSummary } from "../api/movieDetails";
import { isAbortError } from "../api/tmdb";
import { PLACEHOLDER_POSTER } from "../constants/images";
import "./ViewingHistory.css";

interface HistoryItem extends MovieSummary {
  viewedAt: string;
}

interface LoadedPage {
  items: HistoryItem[];
  page: number;
  totalPages: number;
}

type LoadState = "loading" | "error" | "ready";

const viewedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Loads one page of history and looks up each movie on TMDB, skipping any that can't be loaded. */
async function loadHistoryPage(page: number, signal: AbortSignal): Promise<LoadedPage> {
  const result = await fetchHistory(page, signal);
  const movies = await Promise.allSettled(
    result.history.map(async (entry) => ({
      ...(await fetchMovieSummary(entry.movieId, signal)),
      viewedAt: entry.viewedAt,
    })),
  );
  return {
    items: movies.flatMap((movie) => (movie.status === "fulfilled" ? [movie.value] : [])),
    page: result.page,
    totalPages: result.totalPages,
  };
}

// Viewing a movie between two page loads moves it to the top, so a later page can repeat it.
function appendNew(existing: HistoryItem[], incoming: HistoryItem[]): HistoryItem[] {
  const seen = new Set(existing.map((movie) => movie.id));
  return [...existing, ...incoming.filter((movie) => !seen.has(movie.id))];
}

/** The profile's "Recently viewed" list: movies the user opened, newest first. */
export default function ViewingHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const moreRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadHistoryPage(1, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setItems(loaded.items);
        setPage(loaded.page);
        setTotalPages(loaded.totalPages);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && !controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [attempt]);

  // Cancels a "Load more" still running when the list goes away.
  useEffect(() => () => moreRequest.current?.abort(), []);

  const retry = () => {
    setState("loading");
    setAttempt((n) => n + 1);
  };

  const loadMore = async () => {
    if (moreRequest.current) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    setLoadingMore(true);
    setMoreError(null);

    try {
      const loaded = await loadHistoryPage(page + 1, controller.signal);
      if (controller.signal.aborted) return;
      setItems((previous) => appendNew(previous, loaded.items));
      setPage(loaded.page);
      setTotalPages(loaded.totalPages);
    } catch (error: unknown) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        setMoreError("Couldn't load more of your history. Please try again.");
      }
    } finally {
      if (moreRequest.current === controller) moreRequest.current = null;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  const confirmClear = useCallback(async () => {
    setClearError(null);
    try {
      await clearHistory();
      moreRequest.current?.abort();
      setItems([]);
      setTotalPages(0);
      setLoadingMore(false);
      setMoreError(null);
      setConfirmingClear(false);
    } catch {
      setClearError("Couldn't clear your history. Please try again.");
    }
  }, []);

  if (state === "loading") {
    return <output className="viewing-history__status">Loading your history…</output>;
  }

  if (state === "error") {
    return (
      <div className="viewing-history__status" role="alert">
        <p>Couldn't load your viewing history.</p>
        <button type="button" className="viewing-history__button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="viewing-history__status">
        Movies you open will appear here. <Link to="/">Find something to watch</Link>.
      </p>
    );
  }

  return (
    <div className="viewing-history">
      <ul className="viewing-history__list">
        {items.map((movie) => (
          <li key={movie.id}>
            <Link to={`/movie/${movie.id}`} className="viewing-history__movie">
              <img src={movie.posterUrl ?? PLACEHOLDER_POSTER} alt="" className="viewing-history__poster" />
              <span className="viewing-history__title">{movie.title}</span>
              <span className="viewing-history__meta">
                {movie.year ?? "Unknown year"} · Viewed{" "}
                <time dateTime={movie.viewedAt}>{viewedAtFormat.format(new Date(movie.viewedAt))}</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {moreError && (
        <p className="viewing-history__error" role="alert">
          {moreError}
        </p>
      )}

      <div className="viewing-history__actions">
        {page < totalPages && (
          <button
            type="button"
            className="viewing-history__button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
        {confirmingClear ? (
          <>
            <span>Clear your whole viewing history?</span>
            <button
              type="button"
              className="viewing-history__button viewing-history__button--danger"
              onClick={() => void confirmClear()}
            >
              Clear history
            </button>
            <button type="button" className="viewing-history__button" onClick={() => setConfirmingClear(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="viewing-history__button" onClick={() => setConfirmingClear(true)}>
            Clear history…
          </button>
        )}
      </div>
      {clearError && (
        <p className="viewing-history__error" role="alert">
          {clearError}
        </p>
      )}
    </div>
  );
}
