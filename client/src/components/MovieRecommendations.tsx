import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRecommendedMovies } from "../api/recommendedMovies";
import { isAbortError } from "../api/tmdb";
import type { Movie } from "../types/movie";
import "./MovieRecommendations.css";

const PLACEHOLDER_POSTER = "https://via.placeholder.com/300x450?text=No+Poster";

interface Props {
  movieId: number;
}

export default function MovieRecommendations({ movieId }: Readonly<Props>) {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        setRecommendations(await fetchRecommendedMovies(movieId, controller.signal));
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchRecommendations();

    return () => controller.abort();
  }, [movieId]);

  if (loading) {
    return <div className="message-container">Loading recommendations…</div>;
  }

  if (recommendations.length === 0) {
    return <div className="message-container">No recommendations available.</div>;
  }

  return (
    <div className="recommendations-section">
      <div className="recommendations-track">
        {recommendations.map((movie) => (
          <button
            key={movie.id}
            type="button"
            className="recommendation-card"
            onClick={() => void navigate(`/movie/${movie.id}`)}
          >
            <img
              src={movie.posterUrl ?? PLACEHOLDER_POSTER}
              alt={movie.title}
              className="recommendation-poster"
            />
            <p className="recommendation-title">{movie.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
