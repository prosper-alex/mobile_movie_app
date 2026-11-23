export type RequestErrorKind =
  | "configuration"
  | "network"
  | "timeout"
  | "http"
  | "invalid-response"
  | "unavailable";

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly kind: RequestErrorKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export const abortError = () => {
  const error = new Error("Request cancelled.");
  error.name = "AbortError";
  return error;
};

export const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

export const isRecoverable = (error: unknown) =>
  error instanceof RequestError &&
  (error.kind === "network" ||
    error.kind === "timeout" ||
    (error.kind === "http" &&
      error.status !== undefined &&
      [429, 500, 502, 503, 504].includes(error.status)));

type Options = {
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
};

const httpError = (status: number) => {
  const message =
    status === 401 || status === 403
      ? "Movie service access is unavailable. Please try again later."
      : status === 404
        ? "This movie could not be found."
        : status === 429
          ? "The movie service is busy. Please wait a moment and try again."
          : "The movie service could not complete the request. Please try again.";
  return new RequestError(message, "http", status);
};

// Only read requests are retried. Cancellation and the timeout cover the body too.
export async function fetchJson(
  url: string,
  { headers, signal, timeoutMs = 10000, retries = 1 }: Options = {},
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      const interrupted = new Promise<never>((_, reject) => {
        onAbort = () => {
          reject(abortError());
          controller.abort();
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        timer = setTimeout(() => {
          reject(
            new RequestError(
              "The request took too long. Check your connection and try again.",
              "timeout",
            ),
          );
          controller.abort();
        }, timeoutMs);
      });
      const request = (async () => {
        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        if (!response.ok) throw httpError(response.status);
        try {
          return await response.json();
        } catch {
          throw new RequestError(
            "The movie service returned an unreadable response. Please try again.",
            "invalid-response",
          );
        }
      })();
      return await Promise.race([request, interrupted]);
    } catch (error) {
      if (signal?.aborted) throw abortError();
      const safeError =
        error instanceof RequestError
          ? error
          : new RequestError(
              "Could not connect to the movie service. Check your connection and try again.",
              "network",
            );
      if (attempt >= retries || !isRecoverable(safeError)) throw safeError;
    } finally {
      clearTimeout(timer);
      if (onAbort) signal?.removeEventListener("abort", onAbort);
    }
    // A bounded delay avoids immediately repeating a failed read.
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, 300);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  }
}
