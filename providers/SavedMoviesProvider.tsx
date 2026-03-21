import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

import type { MovieSummary } from "@/types/movies";

type SavedMoviesContextValue = {
  saved: MovieSummary[];
  hydrated: boolean;
  isSaved: (movieId: number) => boolean;
  save: (movie: MovieSummary) => Promise<void>;
  remove: (movieId: number) => Promise<void>;
  toggle: (movie: MovieSummary) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
};

const STORAGE_KEY = "saved_movies_v1";

const SavedMoviesContext = createContext<SavedMoviesContextValue | null>(null);

const isMovieSummary = (value: unknown): value is MovieSummary => {
  if (!value || typeof value !== "object") return false;
  const movie = value as Record<string, unknown>;
  return (
    typeof movie.id === "number" &&
    typeof movie.title === "string" &&
    (typeof movie.poster_path === "string" || movie.poster_path === null) &&
    typeof movie.vote_average === "number" &&
    typeof movie.release_date === "string"
  );
};

const loadSavedMovies = async (): Promise<MovieSummary[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMovieSummary);
  } catch {
    return [];
  }
};

const persistSavedMovies = async (movies: MovieSummary[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
};

export const SavedMoviesProvider = ({ children }: { children: React.ReactNode }) => {
  const [saved, setSaved] = useState<MovieSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const movies = await loadSavedMovies();
    setSaved(movies);
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (movieId: number) => saved.some((movie) => movie.id === movieId),
    [saved],
  );

  const save = useCallback(async (movie: MovieSummary) => {
    setSaved((current) => {
      if (current.some((m) => m.id === movie.id)) return current;
      const next = [movie, ...current];
      void persistSavedMovies(next);
      return next;
    });
  }, []);

  const remove = useCallback(async (movieId: number) => {
    setSaved((current) => {
      const next = current.filter((movie) => movie.id !== movieId);
      void persistSavedMovies(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    async (movie: MovieSummary) => {
      if (isSaved(movie.id)) {
        await remove(movie.id);
      } else {
        await save(movie);
      }
    },
    [isSaved, remove, save],
  );

  const clear = useCallback(async () => {
    setSaved([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<SavedMoviesContextValue>(
    () => ({
      saved,
      hydrated,
      isSaved,
      save,
      remove,
      toggle,
      clear,
      refresh,
    }),
    [saved, hydrated, isSaved, save, remove, toggle, clear, refresh],
  );

  return <SavedMoviesContext.Provider value={value}>{children}</SavedMoviesContext.Provider>;
};

export const useSavedMovies = () => {
  const ctx = React.useContext(SavedMoviesContext);
  if (!ctx) {
    throw new Error("useSavedMovies must be used within SavedMoviesProvider");
  }
  return ctx;
};

