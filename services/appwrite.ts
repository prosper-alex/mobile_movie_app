// Track the searches made by a user
import client from "@/lib/appwrite";
import { abortError, isAbortError, RequestError } from "@/services/request";
import type { MovieSummary } from "@/types/movies";
import { ID, Query, TablesDB } from "appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_TABLE_ID;

const tablesDB = client ? new TablesDB(client) : null;
const APPWRITE_TIMEOUT_MS = 6000;

const withTimeout = async <T,>(promise: Promise<T>, ms: number, signal?: AbortSignal) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      onAbort = () => reject(abortError());
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
      timer = setTimeout(() => reject(new RequestError(
        "Trending searches took too long to load. Check your connection and try again.", "timeout",
      )), ms);
    })]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
};
const SEARCH_KEYS = [
  "SearchTerm",
  "search_term",
  "searchTerm",
  "query",
  "term",
  "search",
];
const MOVIE_ID_KEYS = ["MovieId", "movie_id", "movieId"];
const POSTER_KEYS = ["PosterUrl", "poster_url", "posterUrl"];

const isMissingAttributeError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid query") || message.includes("attribute not found")
  );
};

const isMissingRequiredAttributeError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("missing required attribute");
};

const tryListRowsByKnownSearchKeys = async (query: string) => {
  if (!tablesDB || !DATABASE_ID || !TABLE_ID) {
    return {
      result: { rows: [] as any[] },
      matchedSearchKey: null as string | null,
    };
  }

  for (const key of SEARCH_KEYS) {
    try {
      const result = await withTimeout(
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          queries: [Query.equal(key, query)],
        }),
        APPWRITE_TIMEOUT_MS,
      );
      return { result, matchedSearchKey: key };
    } catch (error) {
      if (!isMissingAttributeError(error)) throw error;
    }
  }

  return {
    result: { rows: [] as any[] },
    matchedSearchKey: null as string | null,
  };
};

const listRowsBySearchTerm = async (query: string) => {
  return tryListRowsByKnownSearchKeys(query);
};

const createSearchRow = async (
  query: string,
  movie: MovieSummary,
  preferredSearchKey: string | null,
) => {
  if (!tablesDB || !DATABASE_ID || !TABLE_ID) return null;

  const poster = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  const searchCandidates = preferredSearchKey
    ? [
        preferredSearchKey,
        ...SEARCH_KEYS.filter((key) => key !== preferredSearchKey),
      ]
    : SEARCH_KEYS;

  const payloads: Record<string, unknown>[] = [];
  for (const searchKey of searchCandidates) {
    for (const movieIdKey of MOVIE_ID_KEYS) {
      for (const posterKey of POSTER_KEYS) {
        payloads.push({
          [searchKey]: query,
          [movieIdKey]: movie.id,
          title: movie.title,
          count: 1,
          [posterKey]: poster,
        });
      }
    }
  }

  let lastError: unknown = null;
  for (const payload of payloads) {
    try {
      return await withTimeout(
        tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: ID.unique(),
          data: payload,
        }),
        APPWRITE_TIMEOUT_MS,
      );
    } catch (error) {
      lastError = error;
      if (
        isMissingAttributeError(error) ||
        isMissingRequiredAttributeError(error)
      ) {
        continue;
      }
      throw error;
    }
  }

  throw (
    lastError ??
    new Error("Unable to map Appwrite table schema to row payload.")
  );
};

export const updateSearchCount = async (query: string, movie: MovieSummary) => {
  if (!tablesDB || !DATABASE_ID || !TABLE_ID) return;

  try {
    const { result, matchedSearchKey } = await listRowsBySearchTerm(query);

    if (result.rows.length > 0) {
      const existingMovie = result.rows[0];

      await withTimeout(
        tablesDB.updateRow(DATABASE_ID, TABLE_ID, existingMovie.$id, {
          count: existingMovie.count + 1,
        }),
        APPWRITE_TIMEOUT_MS,
      );
    } else {
      await createSearchRow(query, movie, matchedSearchKey);
    }
  } catch {
    throw new Error("Search activity could not be recorded.");
  }
};

export const parseTrendingRows = (value: unknown): TrendingMovie[] => {
  const invalid = () => new RequestError(
    "Trending searches returned incomplete data. Please try again later.", "invalid-response",
  );
  if (!value || typeof value !== "object" || !Array.isArray((value as { rows?: unknown }).rows)) throw invalid();
  return (value as { rows: unknown[] }).rows.map((value) => {
    if (!value || typeof value !== "object") throw invalid();
    const row = value as Record<string, unknown>;
    const searchKey = SEARCH_KEYS.find((key) => key in row);
    const idKey = MOVIE_ID_KEYS.find((key) => key in row);
    const posterKey = POSTER_KEYS.find((key) => key in row);
    if (!searchKey || !idKey || !posterKey) throw invalid();
    const id = typeof row[idKey] === "string" && String(row[idKey]).trim() ? Number(row[idKey]) : row[idKey];
    if (!Number.isSafeInteger(id) || Number(id) <= 0 ||
        typeof row[searchKey] !== "string" || !String(row[searchKey]).trim() ||
        typeof row[posterKey] !== "string" ||
        typeof row.title !== "string" ||
        typeof row.count !== "number" || !Number.isFinite(row.count) || row.count < 0) throw invalid();
    return {
      search_term: row[searchKey] as string,
      movie_id: Number(id),
      poster_url: row[posterKey] as string,
      title: row.title,
      count: row.count,
    };
  });
};

export const getTrendingMovies = async (signal?: AbortSignal): Promise<TrendingMovie[]> => {
  if (signal?.aborted) throw abortError();
  if (!tablesDB || !DATABASE_ID || !TABLE_ID) throw new RequestError(
    "Trending searches aren't configured yet. Movie discovery is still available.", "configuration",
  );
  try {
    const result = await withTimeout(tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [Query.orderDesc("count"), Query.limit(5)],
    }), APPWRITE_TIMEOUT_MS, signal);
    return parseTrendingRows(result);
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw abortError();
    if (error instanceof RequestError) throw error;
    const failure = error as { type?: string; code?: number } | null;
    if (failure?.type === "project_paused") throw new RequestError(
      "Trending searches are temporarily unavailable. Movie discovery is still available.", "unavailable",
    );
    if (failure?.code === 401 || failure?.code === 403) throw new RequestError(
      "Trending searches are unavailable because access was denied. Please try again later.", "http", failure.code,
    );
    if (failure?.code && failure.code > 0) throw new RequestError(
      "Trending searches couldn't be loaded from the service. Please try again.", "http", failure.code,
    );
    throw new RequestError(
      "Couldn't connect to trending searches. Check your connection and try again.", "network",
    );
  }
};
