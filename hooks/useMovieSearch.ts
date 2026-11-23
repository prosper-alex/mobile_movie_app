import { useCallback, useEffect, useState } from "react";
import { fetchMovies } from "@/services/api";
import useFetch from "@/services/useFetch";

type Options = {
  emptyQueryBehavior: "fetch" | "reset";
  debounceMs?: number;
  initialQuery?: string;
};

export default function useMovieSearch({ emptyQueryBehavior, debounceMs = 500, initialQuery = "" }: Options) {
  const [query, setQuery] = useState(initialQuery);
  const fetcher = useCallback((signal?: AbortSignal) => fetchMovies({ query, signal }), [query]);
  const { data, loading, error, refetch, reset, cancel } = useFetch(fetcher, false);

  useEffect(() => {
    // Invalidate previous results immediately, rather than after the debounce.
    reset();
    if (!query.trim()) {
      if (emptyQueryBehavior === "fetch") void refetch();
      return cancel;
    }
    const timer = setTimeout(() => void refetch(), debounceMs);
    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [cancel, debounceMs, emptyQueryBehavior, query, refetch, reset]);

  const waitingForResults = (Boolean(query.trim()) || emptyQueryBehavior === "fetch") && data === null && error === null;
  return { query, setQuery, movies: data, loading: loading || waitingForResults, error, refetch, reset };
}
