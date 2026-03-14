// Track the searches made by a user
import client from "@/lib/appwrite";
import { ID, Query, TablesDB } from "appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_TABLE_ID!;

const tablesDB = new TablesDB(client);
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
  for (const key of SEARCH_KEYS) {
    try {
      const result = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.equal(key, query)],
      });
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
  movie: Movie,
  preferredSearchKey: string | null,
) => {
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
      return await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: payload,
      });
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

export const updateSearchCount = async (query: string, movie: Movie) => {
  try {
    const { result, matchedSearchKey } = await listRowsBySearchTerm(query);

    if (result.rows.length > 0) {
      const existingMovie = result.rows[0];

      await tablesDB.updateRow(DATABASE_ID, TABLE_ID, existingMovie.$id, {
        count: existingMovie.count + 1,
      });
    } else {
      await createSearchRow(query, movie, matchedSearchKey);
    }
  } catch (error) {
    console.log("Appwrite updateSearchCount failed:", error);
    throw error;
  }
};

export const getTrendingMovies = async (): Promise<
  TrendingMovie[] | undefined
> => {
  try {
    const mapRowToTrendingMovie = (row: Record<string, unknown>) => {
      const searchTermKey = SEARCH_KEYS.find((key) => key in row);
      const movieIdKey = MOVIE_ID_KEYS.find((key) => key in row);
      const posterKey = POSTER_KEYS.find((key) => key in row);

      if (!searchTermKey || !movieIdKey || !posterKey) return null;

      const searchTerm = row[searchTermKey];
      const movieId = row[movieIdKey];
      const posterUrl = row[posterKey];
      const title = row.title;
      const count = row.count;

      if (
        typeof searchTerm !== "string" ||
        (typeof movieId !== "number" && typeof movieId !== "string") ||
        typeof posterUrl !== "string" ||
        typeof title !== "string" ||
        typeof count !== "number"
      ) {
        return null;
      }

      return {
        search_term: searchTerm,
        movie_id: typeof movieId === "number" ? movieId : Number(movieId),
        title,
        count,
        poster_url: posterUrl,
      };
    };

    let result;
    try {
      result = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.orderDesc("count"), Query.limit(5)],
      });
    } catch (error) {
      if (!isMissingAttributeError(error)) throw error;
      result = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.limit(5)],
      });
    }

    return result.rows
      .map((row) => mapRowToTrendingMovie(row as Record<string, unknown>))
      .filter((row): row is TrendingMovie => row !== null);
  } catch (error) {
    console.log(error);
    return undefined;
  }
};
