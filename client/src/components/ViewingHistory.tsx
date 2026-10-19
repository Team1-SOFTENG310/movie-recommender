import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearHistory, fetchHistory } from "../api/history";
import { fetchMovieSummary, type MovieSummary } from "../api/movieDetails";
import { isAbortError } from "../api/tmdb";
import { PLACEHOLDER_POSTER } from "../constants/images";
import "./ViewingHistory.css";

interface HistoryItem extends MovieSummary {
  viewedAt: string;
}

type LoadState = "loading" | "error" | "ready";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Looks up each viewed movie on TMDB, skipping any that can't be loaded. */
async function loadHistory(signal: AbortSignal): Promise<HistoryItem[]> {
  const history = await fetchHistory(signal);
  const results = await Promise.allSettled(
    history.map(async (entry) => ({
      ...(await fetchMovieSummary(entry.movieId, signal)),
      viewedAt: entry.viewedAt,
    })),
  );
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

/** The profile's "Recently viewed" list: movies the user opened, newest first. */
export default function ViewingHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadHistory(controller.signal)
      .then((loaded) => {
        setItems(loaded);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) setState("error");
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setState("loading");
    setAttempt((n) => n + 1);
  };

  const confirmClear = useCallback(async () => {
    setClearError(null);
    try {
      await clearHistory();
      setItems([]);
      setConfirmingClear(false);
    } catch {
      setClearError("Couldn't clear your history. Please try again.");
    }
  }, []);

  if (state === "loading") {
    return <p className="viewing-history__status">Loading your history…</p>;
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
                <time dateTime={movie.viewedAt}>{dateFormat.format(new Date(movie.viewedAt))}</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="viewing-history__actions">
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
