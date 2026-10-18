import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.themoviedb.org/3/search/movie", () => {
    return HttpResponse.json({
      results: [
        {
          id: 123456,
          title: "TestMovie1",
          release_date: "2000-01-01",
          poster_path: "/7GC0TEOQ1ljAhtvcwdthAbb5D3h.jpg",
          overview: "Test Movie Overview.",
          genre_ids: [1, 2, 3],
          vote_average: 7,
        },
      ],
      page: 1,
      total_pages: 1,
      total_results: 1,
    });
  }),

  http.get("https://api.themoviedb.org/3/discover/movie", () => {
    return HttpResponse.json({
      results: [
        {
          id: 654321,
          title: "TestDiscoverMovie",
          release_date: "2015-06-01",
          poster_path: "/abc123.jpg",
          overview: "A discovered test movie.",
          genre_ids: [28],
          vote_average: 8.2,
        },
      ],
      page: 1,
      total_pages: 1,
      total_results: 1,
    });
  }),

  http.get("https://api.themoviedb.org/3/search/person", () => {
    return HttpResponse.json({
      results: [
        {
          id: 999,
          name: "Test Actor",
          profile_path: "/actor.jpg",
          known_for_department: "Acting",
          popularity: 15.5,
        },
        {
          id: 998,
          name: "Test Actor Two",
          profile_path: null,
          known_for_department: "Acting",
          popularity: 5.2,
        },
      ],
      page: 1,
      total_pages: 1,
      total_results: 2,
    });
  }),

  http.get("https://api.themoviedb.org/3/movie/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: "Final Destination Bloodlines",
      overview:
        "Plagued by a violent recurring nightmare, college student Stefanie heads home to track down the one person who might be able to break the cycle and save her family from the grisly demise that inevitably awaits them all.",
      poster_path: "/final-destination-bloodlines.jpg",
      release_date: "2025-05-14",
      runtime: 110,
      vote_average: 7.0,
      genres: [
        { id: 27, name: "Horror" },
        { id: 9648, name: "Mystery" },
      ],
      credits: {
        cast: [
          {
            id: 1001,
            name: "Kaitlyn Santa Juana",
            character: "Stefani Reyes",
            profile_path: "/kaitlyn-santa-juana.jpg",
          },
          {
            id: 1002,
            name: "Teo Briones",
            character: "Charlie Reyes",
            profile_path: "/teo-briones.jpg",
          },
          {
            id: 1003,
            name: "Rya Kihlstedt",
            character: "Darlene Campbell",
            profile_path: "/rya-kihlstedt.jpg",
          },
          {
            id: 1004,
            name: "Richard Harmon",
            character: "Erik",
            profile_path: "/richard-harmon.jpg",
          },
          {
            id: 1005,
            name: "Owen Patrick Joyner",
            character: "Bobby",
            profile_path: "/owen-patrick-joyner.jpg",
          },
        ],
      },
    });
  }),

  http.get("https://api.themoviedb.org/3/movie/:id/recommendations", () => {
    return HttpResponse.json({
      results: [
        {
          id: 100,
          title: "TestRecommendedMovie",
          poster_path: "/rec1.jpg",
          release_date: "2026-01-01",
        },
      ],
      page: 1,
      total_pages: 1,
      total_results: 1,
    });
  },
),
    // derived from Final Destination Bloodlines for guaranteed image paths and genre codes
    http.get("http://localhost:5000/api/movies/random", () => {
        return HttpResponse.json({
        id: 123,
        title: "Not a real movie",
        overview: "A generic movie",
        poster_path: "/final-destination-bloodlines.jpg", // filler image
        release_date: "2025-05-14",
        runtime: 20,
        vote_average: 1.4,
        genres: [
            { id: 27, name: "Horror" },
            { id: 9648, name: "Mystery" },
        ],
        credits: {
            cast: [
            {
                id: 1001,
                name: "Kaitlyn Santa Juana",
                character: "Stefani Reyes",
                profile_path: "/kaitlyn-santa-juana.jpg",
            },
            {
                id: 1002,
                name: "Teo Briones",
                character: "Charlie Reyes",
                profile_path: "/teo-briones.jpg",
            }
            ],
        },
        });
    }),

  http.get("https://api.themoviedb.org/3/movie/:id/reviews", () => {
    return HttpResponse.json({
      results: [
        { id: "1", author: "ReviewerOne", content: "Great movie, loved the pacing and the ending.", author_details: { rating: 8 } },
        { id: "2", author: "ReviewerTwo", content: "It was okay, nothing special.", author_details: { rating: 5 } },
        { id: "3", author: "ReviewerThree", content: "Absolutely fantastic cinematography.", author_details: { rating: 9 } },
        { id: "4", author: "ReviewerFour", content: "Not my taste but well made.", author_details: { rating: null } },
        { id: "5", author: "ReviewerFive", content: "A solid watch overall.", author_details: { rating: 7 } },
        { id: "6", author: "ReviewerSix", content: "Would recommend to fans of the genre.", author_details: { rating: 6 } },
      ],
      page: 1,
      total_pages: 1,
      total_results: 6,
    });
  }),
  http.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/me`, () => {
    return HttpResponse.json(
      { message: "Not authenticated" },
      { status: 401 },
    );
  }),
];
