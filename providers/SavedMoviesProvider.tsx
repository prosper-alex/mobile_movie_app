import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MovieSummary } from "@/types/movies";
import { createSavedMoviesStorage } from "@/lib/savedMoviesStorage";
import { readStoredItem } from "@/lib/storage";

type SavedMoviesContextValue = {
  saved: MovieSummary[];
  hydrated: boolean;
  pending: boolean;
  error: Error | null;
  isSaved: (movieId: number) => boolean;
  save: (movie: MovieSummary) => Promise<boolean>;
  remove: (movieId: number) => Promise<boolean>;
  toggle: (movie: MovieSummary) => Promise<boolean>;
  clear: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
  retry: () => Promise<boolean>;
};
const SavedMoviesContext = createContext<SavedMoviesContextValue | null>(null);

export const SavedMoviesProvider = ({ children }: { children: React.ReactNode }) => {
  const [saved, setSaved] = useState<MovieSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const failedOperation = useRef<(() => Promise<void>) | null>(null);
  const [storage] = useState(() => createSavedMoviesStorage({
    getItem: readStoredItem,
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  }, (movies) => {
    if (!mounted.current) return;
    setSaved(movies);
    setHydrated(true);
  }));

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (mounted.current) {
      setPendingCount((count) => count + 1);
      setError(null);
    }
    try {
      await operation();
      failedOperation.current = null;
      if (mounted.current) setError(null);
      return true;
    } catch (failure) {
      failedOperation.current = operation;
      if (mounted.current) setError(failure instanceof Error ? failure : new Error("Couldn't update saved movies. Please try again."));
      return false;
    } finally {
      if (mounted.current) setPendingCount((count) => count - 1);
    }
  }, []);
  const refresh = useCallback(() => run(storage.refresh), [run, storage]);
  const retry = useCallback(() => run(failedOperation.current ?? storage.refresh), [run, storage]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const isSaved = useCallback((id: number) => saved.some((movie) => movie.id === id), [saved]);
  const save = useCallback((movie: MovieSummary) => run(() => storage.save(movie)), [run, storage]);
  const remove = useCallback((id: number) => run(() => storage.remove(id)), [run, storage]);
  const toggle = useCallback((movie: MovieSummary) => run(() => storage.toggle(movie)), [run, storage]);
  const clear = useCallback(() => run(storage.clear), [run, storage]);
  const value = useMemo(() => ({ saved, hydrated, pending: pendingCount > 0, error, isSaved, save, remove, toggle, clear, refresh, retry }),
    [saved, hydrated, pendingCount, error, isSaved, save, remove, toggle, clear, refresh, retry]);
  return <SavedMoviesContext.Provider value={value}>{children}</SavedMoviesContext.Provider>;
};

export const useSavedMovies = () => {
  const context = React.useContext(SavedMoviesContext);
  if (!context) throw new Error("useSavedMovies must be used within SavedMoviesProvider");
  return context;
};
