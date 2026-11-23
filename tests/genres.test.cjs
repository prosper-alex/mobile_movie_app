const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");

const load = createLoader({
  env: { EXPO_PUBLIC_MOVIE_API_KEY: "test-token" },
  fetch: async (url, options) => {
    assert.match(url, /\/genre\/movie\/list\?language=en$/);
    assert.equal(options.method, "GET");
    return { ok: true, json: async () => ({ genres: [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }] }) };
  },
});
const { fetchMovieGenres, parseMovieGenres } = load("services/api.ts");

test("movie genres are loaded from the existing TMDB request layer", async () => {
  assert.deepEqual(await fetchMovieGenres(), [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }]);
});

test("movie genre parsing removes duplicate IDs", () => {
  assert.deepEqual(parseMovieGenres({ genres: [
    { id: 28, name: "Action" }, { id: 28, name: "Action" },
  ] }), [{ id: 28, name: "Action" }]);
});

test("invalid genre payloads fail instead of using a fallback catalogue", () => {
  for (const response of [null, {}, { genres: null }, { genres: [{ id: 0, name: "Action" }] }, { genres: [{ id: 28, name: "" }] }]) {
    assert.throws(() => parseMovieGenres(response), /incomplete data/i);
  }
});
