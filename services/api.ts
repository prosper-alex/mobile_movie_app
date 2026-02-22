export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,

  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
  },
};

export const fetchMovies = async ({ query }: { query: string }) => {
  if (!TMDB_CONFIG.API_KEY) {
    throw new Error(
      "Missing TMDB API key. Set EXPO_PUBLIC_MOVIE_API_KEY in your .env file.",
    );
  }

  const endpoint = query
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc&vote_count.gte=50`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch movies (${response.status} ${response.statusText}): ${errorBody}`,
    );
  }

  const data = await response.json();
  return data.results;
};

// const url = "https://api.themoviedb.org/3/authentication";
// const options = {
//   method: "GET",
//   headers: {
//     accept: "application/json",
//     Authorization:
//       "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxYjZlNDk3ZjAxNDE2ZjAxNjIwZjJhOTVlOGMwNTMzNSIsIm5iZiI6MTc3MDg0Njk1Mi4zNDA5OTk4LCJzdWIiOiI2OThjZmFlODRmMmRmYjM5YmNmNDJmZmYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.d2Bd6v4SNUBbdxYx6QsSZcJVB9hHeXBWpVr2O72GRNU",
//   },
// };

// fetch(url, options)
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err));
