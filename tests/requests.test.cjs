const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");
const ok = (data) => ({ ok: true, json: async () => data });
const failure = (status) => ({ ok: false, status, text: async () => "PRIVATE_RESPONSE_MARKER" });
const movie = (id) => ({ id, title: `Movie ${id}`, poster_path: null, vote_average: 7, release_date: "" });
const env = { EXPO_PUBLIC_MOVIE_API_KEY: "test-placeholder" };

test("401 is sanitized and is not retried", async () => {
  let calls = 0;
  const { fetchJson } = createLoader({ fetch: async () => { calls++; return failure(401); } })("services/request.ts");
  await assert.rejects(fetchJson("https://example.test"), (error) => error.status === 401 && !error.message.includes("PRIVATE_RESPONSE_MARKER"));
  assert.equal(calls, 1);
});

test("a transient GET failure is retried once", async () => {
  let calls = 0;
  const { fetchJson } = createLoader({ fetch: async () => ++calls === 1 ? failure(503) : ok({ success: true }) })("services/request.ts");
  assert.equal((await fetchJson("https://example.test")).success, true);
  assert.equal(calls, 2);
});

test("network failures are bounded and do not expose transport details", async () => {
  let calls = 0;
  const { fetchJson } = createLoader({ fetch: async () => { calls++; throw new Error("PRIVATE_TRANSPORT_MARKER"); } })("services/request.ts");
  await assert.rejects(fetchJson("https://example.test"), (error) => error.kind === "network" && !error.message.includes("PRIVATE_TRANSPORT_MARKER"));
  assert.equal(calls, 2);
});

test("timeout aborts a request even when transport never settles", async () => {
  let signal;
  const { fetchJson } = createLoader({ fetch: (_url, options) => { signal = options.signal; return new Promise(() => {}); } })("services/request.ts");
  await assert.rejects(fetchJson("https://example.test", { timeoutMs: 5, retries: 0 }), (error) => error.kind === "timeout");
  assert.equal(signal.aborted, true);
});

test("timeout also covers response-body reading", async () => {
  const { fetchJson } = createLoader({ fetch: async () => ({ ok: true, json: () => new Promise(() => {}) }) })("services/request.ts");
  await assert.rejects(fetchJson("https://example.test", { timeoutMs: 5, retries: 0 }), (error) => error.kind === "timeout");
});

test("cancellation aborts transport and does not retry", async () => {
  let calls = 0, requestSignal;
  const { fetchJson } = createLoader({ fetch: (_url, options) => { calls++; requestSignal = options.signal; return new Promise(() => {}); } })("services/request.ts");
  const controller = new AbortController();
  const pending = fetchJson("https://example.test", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(requestSignal.aborted, true);
  assert.equal(calls, 1);
});

test("cancellation during retry delay prevents the next request", async () => {
  let calls = 0;
  const controller = new AbortController();
  const { fetchJson } = createLoader({ fetch: async () => { calls++; return failure(503); } })("services/request.ts");
  const pending = fetchJson("https://example.test", { signal: controller.signal });
  await new Promise(setImmediate);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("unreadable responses are not mistaken for network errors or retried", async () => {
  let calls = 0;
  const { fetchJson } = createLoader({ fetch: async () => { calls++; return { ok: true, json: async () => { throw new Error(); } }; } })("services/request.ts");
  await assert.rejects(fetchJson("https://example.test"), (error) => error.kind === "invalid-response");
  assert.equal(calls, 1);
});

test("popular discovery retains its limit and deduplicates pagination", async () => {
  let calls = 0;
  const { fetchMovies } = createLoader({ env, fetch: async (url) => {
    assert(url.includes("/discover/movie?"));
    calls++;
    return ok({ total_pages: 2, results: calls === 1
      ? Array.from({ length: 20 }, (_, i) => movie(i + 1))
      : [movie(20), movie(21), movie(22)] });
  } })("services/api.ts");
  const result = await fetchMovies({ query: "" });
  assert.equal(result.length, 21);
  assert.equal(new Set(result.map((item) => item.id)).size, 21);
  assert.equal(calls, 2);
});

test("transient page-two failure preserves real first-page results", async () => {
  const { fetchMovies } = createLoader({ env, fetch: async (url) => url.endsWith("page=1")
    ? ok({ results: [movie(1)], total_pages: 2 }) : failure(503) })("services/api.ts");
  const result = await fetchMovies({ query: "fixture" });
  assert.equal(result[0].id, 1);
});

test("malformed movie data is an error, not an empty catalogue", async () => {
  const { fetchMovies } = createLoader({ env, fetch: async () => ok({ results: [{}], total_pages: 1 }) })("services/api.ts");
  await assert.rejects(fetchMovies({ query: "fixture" }), (error) => error.kind === "invalid-response");
});

test("missing configuration makes no request", async () => {
  let calls = 0;
  const { fetchMovies } = createLoader({ fetch: async () => { calls++; } })("services/api.ts");
  await assert.rejects(fetchMovies({ query: "" }), (error) => error.kind === "configuration");
  assert.equal(calls, 0);
});

test("search encodes special characters and invalid detail IDs do not fetch", async () => {
  let calls = 0;
  const { fetchMovies, fetchMovieDetails } = createLoader({ env, fetch: async (url) => {
    calls++;
    assert.equal(new URL(url).searchParams.get("query"), "A&B / + 🎬");
    return ok({ results: [], total_pages: 0 });
  } })("services/api.ts");
  await fetchMovies({ query: "A&B / + 🎬" });
  for (const id of [0, -1, 1.5, NaN]) await assert.rejects(fetchMovieDetails(id));
  assert.equal(calls, 1);
});
