import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { discoverMovies } from "../api/discoverMovies";
import Toast from "./Toast";
import { MOVIE_GENRES } from "../constants/genres";
import { MOVIE_LANGUAGES } from "../constants/languages";
import "../styles/RandomButton.css"

export default function RandomButton() {
    const navigate = useNavigate();
    const [buttonName, setButtonName] = useState("Want a random movie?");
    const [showDropdown, setShowDropdown] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        genre: "",
        language: "",
        minRating: 0
    });

    const getRandom = async () => {
        try {
            setButtonName("Generating...")
            setToastMessage(null);
          
            const response = await discoverMovies({
                genre: filters.genre ? Number(filters.genre) : undefined,
                language: filters.language || undefined,
                ratingMin: filters.minRating > 0 ? filters.minRating : undefined,
            });
            if (!response.results || response.results.length === 0) {
                setToastMessage("No movie found matching your criteria. Please adjust filters.");
                setButtonName("Want a random movie?");
                return;
            }

            // randomly select one from the list returned
            // NOSONAR: Math.random() is fine here; we're just picking a random movie,
            // not generating any security-sensitive value.
            const randomIndex = Math.floor(Math.random() * response.results.length); //NOSONAR
            const randomMovie = response.results[randomIndex];
            if (!randomMovie) {
                setToastMessage("No movie found matching your criteria. Please adjust filters.");
                setButtonName("Want a random movie?");
                return;
            }
            
            setButtonName("Generated!")
            // causes redirect (go to movie page)
            void navigate(`/movie/${randomMovie.id}`)
            
          } catch (err: unknown) {
              console.log(err instanceof Error ? err.message : "Something went wrong with RandomButton.");
              
              let errorMessage = "Something went wrong while fetching a random movie. Please try again.";
        
              if (err instanceof Error) {
                  if (err.message.includes("404")) {
                      errorMessage = "No movie found matching your criteria. Please adjust filters.";
                  } else if (err.message.includes("500") || err.message.includes("503")) {
                      errorMessage = "Server is having issues. Please try again in a moment.";
                  } else if (err.message.includes("Network") || err.message.includes("Failed to fetch")) {
                      errorMessage = "Network error. Please check your connection and try again.";
                 }
              }
              setToastMessage(errorMessage);
              setButtonName("Want a random movie?")
          }
    }

    return (
        <div className="random-button-container">
            <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                id="random-button"
            >
                {buttonName}
                <span>▼</span>
            </button>

            {showDropdown && (
                <div className="random-dropdown">
                    <div>
                        <label htmlFor="random-genre">Genre</label>
                        <select
                            id="random-genre"
                            value={filters.genre}
                            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                        >
                            <option value="">All Genres</option>
                            {MOVIE_GENRES.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="random-language">Language</label>
                        <select
                            id="random-language"
                            value={filters.language}
                            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                        >
                            <option value="">All Languages</option>
                            {MOVIE_LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="random-rating">
                            Min Rating:{" "}
                            <span className="random-dropdown__rating-value">
                                {filters.minRating > 0 ? filters.minRating.toFixed(1) : "Any"}
                            </span>
                        </label>
                        <input
                            id="random-rating"
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={filters.minRating}
                            onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                        />
                    </div>

                    <button
                        type="button"
                        className="random-dropdown__submit"
                        onClick={() => {
                            setShowDropdown(false);
                            void getRandom();
                        }}
                    >
                        Generate
                    </button>
                </div>
            )}

            {toastMessage && (
                <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
            )}
        </div>
    );
}