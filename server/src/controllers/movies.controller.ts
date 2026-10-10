import { randomInt } from "node:crypto";

const TMDB_PAGE_MAX = 500 // TMDB defined max page limit, pretty sure it extends beyond that
const DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie";

/**
 * Selects a random page given randRange for the TMDB url
 * @returns A populated url with a random number for the page field
 */
const randomPage = () => {
    const randomUrl = new URL(DISCOVER_URL);
    randomUrl.searchParams.set("api_key", process.env.VITE_TMDB_API_KEY);
    randomUrl.searchParams.set("page", String(randomInt(1, TMDB_PAGE_MAX)));
    randomUrl.searchParams.set("vote_average.gte", String(0));
    return randomUrl.toString()
}

const randomResult = (json) => {
    return json.results[randomInt(0,json.results.length)];
}

export const getRandomMovie = async (_req, res) => {
    try {
        const apiResult = await fetch(randomPage(), {
            method: "GET",
            headers: { accept: "application/json" }
        })

        if (!apiResult.ok) {
            throw new Error(`TMDB request failed with status code: ${apiResult.status}`);
        }

        const data = await apiResult.json();
        res.json(randomResult(data));

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}