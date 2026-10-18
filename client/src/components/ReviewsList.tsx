import { useEffect, useState } from "react";
import "./ReviewsList.css";
import ReviewCard from "./ReviewCard";
import { fetchMovieReviews } from "../api/movieReviews";
import { isAbortError } from "../api/tmdb";
import type { TmdbReview } from "../types/tmdb";

interface Props {
  movieId: number;
}

export default function ReviewsList({ movieId }: Readonly<Props>) {
  const [reviews, setReviews] = useState<TmdbReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReviews = async () => {
      setLoading(true);
      try {
        setReviews(await fetchMovieReviews(movieId, controller.signal));
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        setReviews([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchReviews();

    return () => controller.abort();
  }, [movieId]);

  if (loading) {
    return <div className="message-container">Loading reviews…</div>;
  }

  if (reviews.length === 0) {
    return <div className="message-container">No reviews available</div>;
  }

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <div className="reviews-list">
      {visibleReviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hasMore && (
        <button
          type="button"
          className="show-more"
          onClick={() => setVisibleCount(visibleCount + 5)}
        >
          Show more reviews
        </button>
      )}
    </div>
  )
}
