import { useCallback, useEffect, useRef, useState } from "react";

import { fetchMovies } from "@/services/api";
import useFetch from "@/services/useFetch";

type EmptyQueryBehavior = "fetch" | "reset";

type Options = {
  emptyQueryBehavior: EmptyQueryBehavior;
  debounceMs?: number;
  initialQuery?: string;
};

export default function useMovieSearch({
  emptyQueryBehavior,
  debounceMs = 500,
  initialQuery = "",
}: Options) {
  const [query, setQuery] = useState(initialQuery);
  const isFirstRunRef = useRef(true);

  const fetcher = useCallback(() => fetchMovies({ query }), [query]);
  const { data, loading, error, refetch, reset } = useFetch(fetcher, false);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      if (!query.trim() && emptyQueryBehavior === "fetch") {
        void refetch();
        return;
      }
    }

    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        void refetch();
        return;
      }
      if (emptyQueryBehavior === "fetch") {
        void refetch();
      } else {
        reset();
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [debounceMs, emptyQueryBehavior, query, refetch, reset]);

  return { query, setQuery, movies: data, loading, error, refetch, reset };
}
