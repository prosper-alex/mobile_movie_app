const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");

const movie = (id, genre_ids = [28]) => ({
  id, title: `Movie ${id}`, poster_path: null, vote_average: 7.2, release_date: "2024-01-01", genre_ids,
});

function service({ response, onRequest = () => {} } = {}) {
  return createLoader({
    env: { EXPO_PUBLIC_MOVIE_API_KEY: "test-token" },
    fetch: async (url, options) => {
      onRequest(url, options);
      return { ok: true, json: async () => response ?? { page: 1, total_pages: 1, results: [movie(1), movie(1), movie(2, [12])] } };
    },
  })("services/api.ts");
}

test("genre discovery uses TMDB OR matching and existing request safeguards", async () => {
  let request;
  const api = service({ onRequest: (url, options) => { request = { url: new URL(url), options }; } });
  const results = await api.fetchMoviesByGenres([28, 12, 28]);

  assert.equal(request.url.pathname, "/3/discover/movie");
  assert.equal(request.url.searchParams.get("with_genres"), "28|12");
  assert.equal(request.url.searchParams.get("sort_by"), "popularity.desc");
  assert.equal(request.url.searchParams.get("vote_count.gte"), "50");
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers.Authorization, "Bearer test-token");
  assert.deepEqual(results.map((item) => item.id), [1, 2]);
});

test("empty genre preferences return no recommendations without a request", async () => {
  let requests = 0;
  const api = service({ onRequest: () => { requests++; } });
  assert.equal((await api.fetchMoviesByGenres([])).length, 0);
  assert.equal(requests, 0);
});

test("invalid genre IDs fail before making a request", async () => {
  let requests = 0;
  const api = service({ onRequest: () => { requests++; } });
  await assert.rejects(api.fetchMoviesByGenres([28, 0]), (error) => error.kind === "configuration");
  assert.equal(requests, 0);
});

test("malformed discovery responses remain errors instead of empty recommendations", async () => {
  const api = service({ response: { page: 1, total_pages: 1, results: [{ id: "bad" }] } });
  await assert.rejects(api.fetchMoviesByGenres([28]), (error) => error.kind === "invalid-response");
});
