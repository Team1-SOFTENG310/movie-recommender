import { useEffect, useState } from "react";
import { MOVIE_GENRES } from "../constants/genres";
import { CURRENT_YEAR, MIN_YEAR } from "../constants/filters";
import { MOVIE_LANGUAGES } from "../constants/languages";
import { searchPerson, type Person } from "../api/searchPerson";
import { isSortOption, type DiscoverFilters, type SortOption } from "../api/discoverMovies";
import "./FilterPanel.css";

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
}[] = [
  { value: "popularity", label: "Popularity" },
  { value: "rating", label: "Rating" },
  { value: "release_date", label: "Release date" },
];

interface FilterPanelProps {
  onFiltersChange: (filters: DiscoverFilters) => void;
  // True while a free-text search query is active, disables the actor
  // filter since TMDB's search endpoint returns no cast data to filter on.
  searchActive?: boolean;
  // Seeds the panel's starting state. App.tsx restores this from
  // sessionStorage on mount, so filters survive navigating away to a
  // movie's detail page and back (App fully unmounts/remounts on that
  // route change, so in-memory state alone wouldn't survive the trip)
  initialFilters?: DiscoverFilters;
}

export default function FilterPanel({
  onFiltersChange,
  searchActive = false,
  initialFilters,
}: Readonly<FilterPanelProps>) {
  const [genreId, setGenreId] = useState<number | undefined>(initialFilters?.genre);
  const [yearFrom, setYearFrom] = useState<number>(initialFilters?.yearFrom ?? MIN_YEAR);
  const [yearTo, setYearTo] = useState<number>(initialFilters?.yearTo ?? CURRENT_YEAR);
  const [language, setLanguage] = useState<string | undefined>(initialFilters?.language);
  const [ratingMin, setRatingMin] = useState<number>(initialFilters?.ratingMin ?? 0);
  const [sort, setSort] = useState<SortOption>(initialFilters?.sort ?? "popularity");

  // initialFilters only carries a numeric castId (see DiscoverFilters),
  // not a display name, so the actor's name is separately round-tripped
  // through sessionStorage to restore the input/chip text correctly.
  const [actorQuery, setActorQuery] = useState(()=> {if (!initialFilters?.castId) return "";
    const saved = sessionStorage.getItem("movieSearchActorName");
    return saved ?? "";
  });
  const [actorResults, setActorResults] = useState<Person[]>([]);
  const [selectedActor, setSelectedActor] = useState<Person | null>(() => {
    if (!initialFilters?.castId) return null;
    const savedName = sessionStorage.getItem("movieSearchActorName");
    if (!savedName) return null;
    // Only the id and name are saved; the rest isn't needed to show the chip.
    return { id: initialFilters.castId, name: savedName, profileUrl: null, knownFor: null };
  });
  const [actorSearchLoading, setActorSearchLoading] = useState(false);

  // Debounced actor-name lookup: waits for the user to stop typing
  // before calling TMDB, and skips the call entirely once a specific
  // person has been selected (no point searching for what's already chosen).
  useEffect(() => {
    if (!actorQuery.trim() || selectedActor) {
      setActorResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setActorSearchLoading(true);
      try {
        const results = await searchPerson(actorQuery, controller.signal);
        setActorResults(results.slice(0, 5));
      } catch {
        setActorResults([]);
      } finally {
        setActorSearchLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [actorQuery, selectedActor]);

  // Emits the current filter state upward on every change. castId is
  // force-cleared while searchActive is true so a previously-selected
  // actor can't silently leak into a search-mode query where it has no effect.
  useEffect(() => {
    onFiltersChange({
      genre: genreId,
      yearFrom,
      yearTo,
      language: language || undefined,
      ratingMin: ratingMin > 0 ? ratingMin : undefined,
      castId: searchActive ? undefined : selectedActor?.id,
      sort,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreId, yearFrom, yearTo, language, ratingMin, selectedActor, sort, searchActive]);

  function handleSelectActor(person: Person) {
    setSelectedActor(person);
    setActorQuery(person.name);
    setActorResults([]);
    sessionStorage.setItem("movieSearchActorName", person.name);
  }

  function clearActor() {
    setSelectedActor(null);
    setActorQuery("");
    setActorResults([]);
    sessionStorage.removeItem("movieSearchActorName");
  }

  function clearAll() {
    setGenreId(undefined);
    setYearFrom(MIN_YEAR);
    setYearTo(CURRENT_YEAR);
    setRatingMin(0);
    setSort("popularity");
    clearActor();
  }

  const selectedGenre = MOVIE_GENRES.find((g) => g.id === genreId);
  const hasActiveFilters =
    genreId !== undefined ||
    yearFrom !== MIN_YEAR ||
    yearTo !== CURRENT_YEAR ||
    ratingMin > 0 ||
    selectedActor !== null;

  return (
    <div className="filter-panel">
      <div className="filter-panel__controls">
        <div className="filter-field">
          <label htmlFor="genre-select">Genre</label>
          <select
            id="genre-select"
            value={genreId ?? ""}
            onChange={(e) =>
              setGenreId(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="">All genres</option>
            {MOVIE_GENRES.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field filter-field--actor">
          <label htmlFor="actor-input">Actor</label>
          <input
            id="actor-input"
            type="text"
            placeholder="Search by actor name"
            value={actorQuery}
            disabled={searchActive}
            onChange={(e) => {
              setActorQuery(e.target.value);
              if (selectedActor) setSelectedActor(null);
            }}
          />
          {searchActive && (
            <span className="filter-field__hint">
              Actor filter is unavailable while searching by title.
            </span>
          )}
          {!searchActive && actorSearchLoading && (
            <span className="filter-field__hint">Searching…</span>
          )}
          {!searchActive && actorResults.length > 0 && (
            <ul className="actor-suggestions">
              {actorResults.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectActor(person)}
                  >
                    {person.name}
                    {person.knownFor && (
                      <span className="actor-suggestions__meta">
                        {" "}
                        · {person.knownFor}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="filter-field">
          <label htmlFor="year-from">Year range</label>
          <div className="year-range">
            <input
              id="year-from"
              type="number"
              min={MIN_YEAR}
              max={yearTo}
              value={yearFrom}
              onChange={(e) => setYearFrom(Number(e.target.value))}
            />
            <span>to</span>
            <input
              id="year-to"
              type="number"
              min={yearFrom}
              max={CURRENT_YEAR}
              value={yearTo}
              onChange={(e) => setYearTo(Number(e.target.value))}
            />
          </div>
        </div>
        
        <div className="filter-field">
          <label htmlFor="language-select">Language</label>
          <select
            id="language-select"
            value={language ?? ""}
            onChange={(e) => setLanguage(e.target.value || undefined)}
          >
            <option value="">All languages</option>
            {MOVIE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-field">
          <label htmlFor="rating-slider">
            Minimum rating {ratingMin > 0 ? `(${ratingMin.toFixed(1)}+)` : ""}
          </label>
          <input
            id="rating-slider"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={ratingMin}
            onChange={(e) => setRatingMin(Number(e.target.value))}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="sort-select">Sort by</label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => {
              if (isSortOption(e.target.value)) setSort(e.target.value);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          {selectedGenre && (
            <button
              type="button"
              className="chip"
              onClick={() => setGenreId(undefined)}
            >
              {selectedGenre.name} ✕
            </button>
          )}
          {selectedActor && (
            <button type="button" className="chip" onClick={clearActor}>
              {selectedActor.name} ✕
            </button>
          )}
          {(yearFrom !== MIN_YEAR || yearTo !== CURRENT_YEAR) && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setYearFrom(MIN_YEAR);
                setYearTo(CURRENT_YEAR);
              }}
            >
              {yearFrom}–{yearTo} ✕
            </button>
          )}
          {ratingMin > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => setRatingMin(0)}
            >
              {ratingMin.toFixed(1)}+ rating ✕
            </button>
          )}
          <button
            type="button"
            className="chip chip--clear-all"
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
