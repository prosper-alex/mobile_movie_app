// fetchMovies

import { useCallback, useEffect, useRef, useState } from "react";

// fetchMovieDetails
const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch = true) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // Memoize refetch so useEffect can safely depend on it.
  const fetchData = useCallback(async (): Promise<T | null> => {
    const requestId = ++activeRequestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction();
      if (!isMountedRef.current || requestId !== activeRequestIdRef.current) {
        return null;
      }

      setData(result);
      return result;
    } catch (err: unknown) {
      if (isMountedRef.current && requestId === activeRequestIdRef.current) {
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred"),
        );
      }
      return null;
    } finally {
      if (isMountedRef.current && requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction]);

  const reset = useCallback(() => {
    activeRequestIdRef.current++;
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData, reset };
};

export default useFetch;
