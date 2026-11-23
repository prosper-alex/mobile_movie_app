export const PREFERENCES_STORAGE_KEY = "movie_preferences_v1";
export const LEGACY_ONBOARDING_STORAGE_KEY = "onboarding_seen_v1";
export const MOVIE_GENRE_CATALOGUE_STORAGE_KEY = "movie_genre_catalogue_v1";

export type StoredMovieGenre = Readonly<{ id: number; name: string }>;

export type MoviePreferences = Readonly<{
  schemaVersion: 1;
  genreIds: readonly number[];
  onboardingCompleted: boolean;
}>;

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

const normalizeGenreIds = (value: unknown): number[] => {
  if (!Array.isArray(value) || Array.from(value).some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("Movie preferences contain invalid genres. Please try again.");
  }
  return [...new Set<number>(value)];
};

const parsePreferences = (raw: string): MoviePreferences => {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error();
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1 || typeof record.onboardingCompleted !== "boolean") {
    throw new Error();
  }
  return {
    schemaVersion: 1,
    genreIds: normalizeGenreIds(record.genreIds),
    onboardingCompleted: record.onboardingCompleted,
  };
};

const normalizeGenreCatalogue = (value: unknown): StoredMovieGenre[] => {
  if (!Array.isArray(value) || value.some((genre) =>
    !genre || typeof genre !== "object" ||
    !Number.isSafeInteger((genre as Record<string, unknown>).id) ||
    Number((genre as Record<string, unknown>).id) <= 0 ||
    typeof (genre as Record<string, unknown>).name !== "string" ||
    !(genre as Record<string, unknown>).name)) {
    throw new Error("Movie genres are invalid. Please try again.");
  }
  const seen = new Set<number>();
  return value.map((genre) => genre as StoredMovieGenre).filter((genre) => {
    if (seen.has(genre.id)) return false;
    seen.add(genre.id);
    return true;
  });
};

// Keep one instance per app so reads and read/modify/write operations are ordered.
// No in-memory result is published before its write succeeds.
export function createPreferencesStorage(storage: Storage) {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };

  const read = async (): Promise<MoviePreferences> => {
    try {
      const raw = await storage.getItem(PREFERENCES_STORAGE_KEY);
      // A present record is authoritative, including an explicitly incomplete one.
      // Invalid records must not fall back to defaults and then be overwritten.
      if (raw !== null) return parsePreferences(raw);
      const legacy = await storage.getItem(LEGACY_ONBOARDING_STORAGE_KEY);
      return { schemaVersion: 1, genreIds: [], onboardingCompleted: legacy === "1" };
    } catch {
      throw new Error("Couldn't load your movie preferences. Please try again. Stored preferences haven't been changed.");
    }
  };

  const write = async (preferences: MoviePreferences): Promise<MoviePreferences> => {
    try {
      await storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      throw new Error("Couldn't save your movie preferences. Please try again before continuing.");
    }
    return preferences;
  };

  return {
    load: () => enqueue(read),
    saveGenres: async (genreIds: readonly number[]) => {
      // Capture the caller's selection before waiting for earlier operations.
      const selected = normalizeGenreIds(genreIds);
      return enqueue(async () => {
        const current = await read();
        return write({ ...current, genreIds: selected });
      });
    },
    completeOnboarding: async (genreIds?: readonly number[]) => {
      const selected = genreIds === undefined ? undefined : normalizeGenreIds(genreIds);
      return enqueue(async () => {
        const current = await read();
        return write({
          ...current,
          genreIds: selected ?? current.genreIds,
          onboardingCompleted: true,
        });
      });
    },
    loadGenreCatalogue: () => enqueue(async () => {
      try {
        const raw = await storage.getItem(MOVIE_GENRE_CATALOGUE_STORAGE_KEY);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" ||
            (parsed as Record<string, unknown>).schemaVersion !== 1) throw new Error();
        return normalizeGenreCatalogue((parsed as Record<string, unknown>).genres);
      } catch {
        throw new Error("Couldn't load the saved movie genre list. Please try again.");
      }
    }),
    saveGenreCatalogue: async (genres: readonly StoredMovieGenre[]) => {
      const selected = normalizeGenreCatalogue(genres);
      return enqueue(async () => {
        try {
          await storage.setItem(MOVIE_GENRE_CATALOGUE_STORAGE_KEY, JSON.stringify({
            schemaVersion: 1,
            genres: selected,
          }));
        } catch {
          throw new Error("Couldn't cache the movie genre list.");
        }
        return selected;
      });
    },
  };
}
