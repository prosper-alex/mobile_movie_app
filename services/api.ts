import { fetchJson, isRecoverable, RequestError } from "@/services/request";

export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
  },
};

const MOVIES_DISPLAY_LIMIT = 21;
const invalidResponse = () => new RequestError(
  "The movie service returned incomplete data. Please try again.", "invalid-response",
);

const requireToken = () => {
  if (!TMDB_CONFIG.API_KEY) throw new RequestError(
    "The movie service isn't configured yet. Please try again later.", "configuration",
  );
};

const movieFromResponse = (value: unknown): Movie => {
  if (!value || typeof value !== "object") throw invalidResponse();
  const movie = value as Record<string, unknown>;
  if (!Number.isSafeInteger(movie.id) || Number(movie.id) <= 0 ||
      typeof movie.title !== "string" ||
      (movie.poster_path !== null && typeof movie.poster_path !== "string") ||
      typeof movie.vote_average !== "number" || !Number.isFinite(movie.vote_average) ||
      (movie.release_date !== undefined && typeof movie.release_date !== "string")) {
    throw invalidResponse();
  }
  return { ...movie, release_date: movie.release_date ?? "" } as unknown as Movie;
};

const moviePage = (value: unknown) => {
  if (!value || typeof value !== "object") throw invalidResponse();
  const page = value as Record<string, unknown>;
  if (!Array.isArray(page.results) || !Number.isInteger(page.total_pages) || Number(page.total_pages) < 0) {
    throw invalidResponse();
  }
  return { results: page.results.map(movieFromResponse), total_pages: Number(page.total_pages) };
};

export const fetchMovies = async ({ query, signal }: {
  query: string;
  signal?: AbortSignal;
}): Promise<Movie[]> => {
  requireToken();
  const normalizedQuery = query.trim();
  const endpoint = normalizedQuery
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(normalizedQuery)}`
    : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc&vote_count.gte=50`;
  const readPage = async (page: number) => moviePage(await fetchJson(
    `${endpoint}&page=${page}`, { headers: TMDB_CONFIG.headers, signal },
  ));
  const first = await readPage(1);
  let results = first.results;
  if (results.length < MOVIES_DISPLAY_LIMIT && first.total_pages >= 2) {
    try {
      results = [...results, ...(await readPage(2)).results];
    } catch (error) {
      // Retain real first-page results only for a transient pagination failure.
      if (signal?.aborted || !isRecoverable(error) || results.length === 0) throw error;
    }
  }
  const seen = new Set<number>();
  return results.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  }).slice(0, MOVIES_DISPLAY_LIMIT);
};

export const fetchMoviesByGenres = async (
  genreIds: readonly number[], signal?: AbortSignal,
): Promise<Movie[]> => {
  if (!Array.isArray(genreIds) || genreIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new RequestError("Your saved movie genres are invalid. Please review your preferences.", "configuration");
  }
  const selectedIds = [...new Set(genreIds)];
  if (selectedIds.length === 0) return [];

  requireToken();
  const params = new URLSearchParams({
    with_genres: selectedIds.join("|"),
    sort_by: "popularity.desc",
    "vote_count.gte": "50",
  });
  const page = moviePage(await fetchJson(
    `${TMDB_CONFIG.BASE_URL}/discover/movie?${params.toString()}`,
    { headers: TMDB_CONFIG.headers, signal },
  ));
  const seen = new Set<number>();
  return page.results.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  }).slice(0, MOVIES_DISPLAY_LIMIT);
};

export const fetchMovieDetails = async (
  movieId: number, signal?: AbortSignal,
): Promise<MovieDetails> => {
  requireToken();
  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    throw new RequestError("This movie link is invalid.", "configuration");
  }
  const value = await fetchJson(`${TMDB_CONFIG.BASE_URL}/movie/${movieId}`, {
    headers: TMDB_CONFIG.headers, signal,
  });
  const movie = movieFromResponse(value);
  const details = value as Record<string, unknown>;
  if (!Array.isArray(details.genres) || details.genres.some((genre: unknown) =>
    !genre || typeof genre !== "object" ||
    !Number.isInteger((genre as Record<string, unknown>).id) ||
    typeof (genre as Record<string, unknown>).name !== "string") ||
    (details.overview !== null && typeof details.overview !== "string") ||
    (details.runtime !== null && (typeof details.runtime !== "number" || !Number.isFinite(details.runtime)))) {
    throw invalidResponse();
  }
  return { ...details, ...movie } as unknown as MovieDetails;
};

export type MovieGenre = Readonly<{ id: number; name: string }>;

export const parseMovieGenres = (value: unknown): MovieGenre[] => {
  if (!value || typeof value !== "object" || !Array.isArray((value as Record<string, unknown>).genres)) {
    throw invalidResponse();
  }
  const genres = (value as { genres: unknown[] }).genres;
  if (genres.some((genre) => !genre || typeof genre !== "object" ||
      !Number.isSafeInteger((genre as Record<string, unknown>).id) ||
      Number((genre as Record<string, unknown>).id) <= 0 ||
      typeof (genre as Record<string, unknown>).name !== "string" ||
      !(genre as Record<string, unknown>).name)) {
    throw invalidResponse();
  }
  const seen = new Set<number>();
  return genres.map((genre) => genre as MovieGenre).filter((genre) => {
    if (seen.has(genre.id)) return false;
    seen.add(genre.id);
    return true;
  });
};

export const fetchMovieGenres = async (signal?: AbortSignal): Promise<MovieGenre[]> => {
  requireToken();
  const response = await fetchJson(`${TMDB_CONFIG.BASE_URL}/genre/movie/list?language=en`, {
    headers: TMDB_CONFIG.headers,
    signal,
  });
  return parseMovieGenres(response);
};
