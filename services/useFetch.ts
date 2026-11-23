import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "@/services/request";

const useFetch = <T,>(fetchFunction: (signal?: AbortSignal) => Promise<T>, autoFetch = true) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const activeRequestId = useRef(0);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef<{ fetcher: typeof fetchFunction; promise: Promise<T | null> } | null>(null);

  const cancel = useCallback(() => {
    activeRequestId.current++;
    controller.current?.abort();
    controller.current = null;
    inFlight.current = null;
    if (mounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel();
    };
  }, [cancel]);

  const refetch = useCallback((): Promise<T | null> => {
    if (inFlight.current?.fetcher === fetchFunction) return inFlight.current.promise;
    cancel();
    const requestId = ++activeRequestId.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    const promise = Promise.resolve().then(() => {
      if (nextController.signal.aborted) return null;
      return fetchFunction(nextController.signal);
    }).then((result) => {
      if (mounted.current && requestId === activeRequestId.current && !nextController.signal.aborted) {
        setData(result);
        return result;
      }
      return null;
    }).catch((failure: unknown) => {
      if (mounted.current && requestId === activeRequestId.current &&
          !nextController.signal.aborted && !isAbortError(failure)) {
        setError(failure instanceof Error ? failure : new Error("Couldn't load this content. Please try again."));
      }
      return null;
    }).finally(() => {
      if (requestId === activeRequestId.current) {
        inFlight.current = null;
        controller.current = null;
        if (mounted.current) setLoading(false);
      }
    });
    inFlight.current = { fetcher: fetchFunction, promise };
    return promise;
  }, [cancel, fetchFunction]);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
  }, [cancel]);

  useEffect(() => {
    if (autoFetch) void refetch();
    return cancel;
  }, [autoFetch, cancel, refetch]);

  return { data, loading, error, refetch, reset, cancel };
};

export default useFetch;
