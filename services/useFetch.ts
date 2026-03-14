// fetchMovies

import { useCallback, useEffect, useState } from "react";

// fetchMovieDetails
const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch = true) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Memoize refetch so useEffect can safely depend on it.
  const fetchData = useCallback(async (): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction();
      setData(result);
      return result;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData, reset };
};

export default useFetch;
