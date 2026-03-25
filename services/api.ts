export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,

  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
  },
};

const MOVIES_DISPLAY_LIMIT = 21;

const withQueryParam = (url: string, key: string, value: string) => {
  const [base, queryString = ""] = url.split("?");
  const params = new URLSearchParams(queryString);
  params.set(key, value);
  return `${base}?${params.toString()}`;
};

const fetchTmdbJson = async (endpoint: string) => {
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

  return response.json() as Promise<unknown>;
};

export const fetchMovies = async ({
  query,
}: {
  query: string;
}): Promise<Movie[]> => {
  if (!TMDB_CONFIG.API_KEY) {
    throw new Error(
      "Missing TMDB API key. Set EXPO_PUBLIC_MOVIE_API_KEY in your .env file.",
    );
  }

  const baseEndpoint = query
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc&vote_count.gte=50`;

  const page1Endpoint = withQueryParam(baseEndpoint, "page", "1");
  const page1Data = (await fetchTmdbJson(page1Endpoint)) as {
    results?: unknown;
    total_pages?: unknown;
  };

  const page1Results = Array.isArray(page1Data?.results)
    ? (page1Data.results as Movie[])
    : [];

  if (page1Results.length >= MOVIES_DISPLAY_LIMIT) {
    return page1Results.slice(0, MOVIES_DISPLAY_LIMIT);
  }

  const totalPages =
    typeof page1Data?.total_pages === "number" ? page1Data.total_pages : 0;
  if (totalPages < 2) return page1Results;

  const page2Endpoint = withQueryParam(baseEndpoint, "page", "2");
  const page2Data = (await fetchTmdbJson(page2Endpoint)) as {
    results?: unknown;
  };
  const page2Results = Array.isArray(page2Data?.results)
    ? (page2Data.results as Movie[])
    : [];

  const seenIds = new Set<number>();
  const combined: Movie[] = [];
  for (const movie of [...page1Results, ...page2Results]) {
    if (movie && typeof (movie as Movie).id === "number") {
      const id = (movie as Movie).id;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    combined.push(movie as Movie);
    if (combined.length >= MOVIES_DISPLAY_LIMIT) break;
  }

  return combined;
};

export const fetchMovieDetails = async (
  movieId: number,
): Promise<MovieDetails> => {
  if (!TMDB_CONFIG.API_KEY) {
    throw new Error(
      "Missing TMDB API key. Set EXPO_PUBLIC_MOVIE_API_KEY in your .env file.",
    );
  }

  const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch movie details (${response.status} ${response.statusText}): ${errorBody}`,
    );
  }

  return (await response.json()) as MovieDetails;
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
