import { useState } from "react";
import type { TmdbReview } from "../types/tmdb";

interface Props {
  review: TmdbReview;
}

export default function ReviewCard({ review }: Readonly<Props>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewLength = 200;
  const isLong = review.content.length > previewLength;

  const truncated = review.content.slice(0, previewLength);
  const ellipsis = isLong ? "…" : "";

  const displayText = isExpanded
    ? review.content
    : truncated + ellipsis;

  return (
    <div className="review-card">
      <p className="review-author">{review.author}</p>
      <p className="review-rating">
        {review.author_details.rating != null
          ? `Rating: ${review.author_details.rating}/10`
          : "No rating provided"}
      </p>
      <p className="review-content">{displayText}</p>
      {isLong && (
        <button
          type="button"
          className="review-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}