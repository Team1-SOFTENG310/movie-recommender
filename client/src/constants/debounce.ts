// A title search passes through two debounces before it reaches TMDB:
// SearchBar waits for typing to stop before updating the query, then
// useMovieResults waits again so filter changes made at the same time
// are batched into one request. Tests import these to advance fake
// timers by exactly the right amount instead of sleeping in real time.

/** How long SearchBar waits after the last keystroke before updating the query. */
export const SEARCH_INPUT_DEBOUNCE_MS = 400;

/** How long useMovieResults waits after the query or filters change before fetching. */
export const RESULTS_FETCH_DEBOUNCE_MS = 300;
