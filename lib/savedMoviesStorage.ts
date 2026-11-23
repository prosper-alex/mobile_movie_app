import type { MovieSummary } from "@/types/movies";

export const SAVED_MOVIES_STORAGE_KEY = "saved_movies_v1";

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

const isMovieSummary = (value: unknown): value is MovieSummary => {
  if (!value || typeof value !== "object") return false;
  const movie = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(movie.id) && Number(movie.id) > 0 &&
    typeof movie.title === "string" &&
    (typeof movie.poster_path === "string" || movie.poster_path === null) &&
    typeof movie.vote_average === "number" && Number.isFinite(movie.vote_average) &&
    typeof movie.release_date === "string"
  );
};

// The context still owns UI state; this helper orders its AsyncStorage transactions.
export function createSavedMoviesStorage(
  storage: Storage,
  onCommit: (movies: MovieSummary[]) => void,
) {
  let snapshot: MovieSummary[] = [];
  let hydrated = false;
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    // A rejected operation must not poison subsequent retries.
    queue = result.catch(() => undefined);
    return result;
  };

  const refresh = () => enqueue(async () => {
    let movies: MovieSummary[];
    try {
      const raw = await storage.getItem(SAVED_MOVIES_STORAGE_KEY);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isMovieSummary)) throw new Error();
      const seen = new Set<number>();
      movies = parsed.filter((movie) => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
      });
    } catch {
      throw new Error("Couldn't load your saved movies. Try again. Stored movies haven't been changed.");
    }
    snapshot = movies;
    hydrated = true;
    onCommit(snapshot);
  });

  const change = (update: (current: MovieSummary[]) => MovieSummary[], clear = false) =>
    enqueue(async () => {
      if (!hydrated) throw new Error("Load your saved movies before making changes. Please retry loading.");
      const next = update(snapshot);
      if (next === snapshot) return;
      try {
        if (clear) await storage.removeItem(SAVED_MOVIES_STORAGE_KEY);
        else await storage.setItem(SAVED_MOVIES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        throw new Error("Couldn't update your saved movies. Your previous list is unchanged. Please try again.");
      }
      snapshot = next;
      onCommit(snapshot);
    });

  return {
    refresh,
    save: (movie: MovieSummary) => change((current) => {
      if (!isMovieSummary(movie)) throw new Error("This movie couldn't be saved. Please reload its details.");
      return current.some((item) => item.id === movie.id) ? current : [movie, ...current];
    }),
    remove: (id: number) => change((current) => current.filter((movie) => movie.id !== id)),
    toggle: (movie: MovieSummary) => change((current) => {
      if (!isMovieSummary(movie)) throw new Error("This movie couldn't be saved. Please reload its details.");
      return current.some((item) => item.id === movie.id)
        ? current.filter((item) => item.id !== movie.id)
        : [movie, ...current];
    }),
    clear: () => change(() => [], true),
  };
}
