import { useEffect, useRef, useState } from "react";
import { SEARCH_INPUT_DEBOUNCE_MS } from "../constants/debounce";
import "./SearchBar.css";

interface SearchBarProps {
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  debounceMs?: number;
  initialValue?: string;
}

export default function SearchBar({
  onQueryChange,
  isLoading = false,
  placeholder = "e.g. Blade Runner, Mulholland Drive…",
  debounceMs = SEARCH_INPUT_DEBOUNCE_MS,
  initialValue = "",
}: Readonly<SearchBarProps>) {
  const [inputValue, setInputValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQueryChangeRef = useRef(onQueryChange);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      onQueryChangeRef.current(inputValue.trim());
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, debounceMs]);

  return (
    <div className="hero">
      <p className="hero__eyebrow">Your personal film guide</p>
      <h2 className="hero__title">
        What do you feel
        <br />
        <span className="hero__title-accent">like watching?</span>
      </h2>
      <p className="hero__subtitle">
        Enter a film you love — we'll find something worth your next evening.
      </p>

      <div className="search-bar">
        <svg
          className="search-bar__icon"
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
          />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search movies"
          className="search-bar__input"
          disabled={isLoading}
        />
        {isLoading && (
          <span className="search-bar__spinner" role="status" aria-live="polite" />
        )}
      </div>
    </div>
  );
}
