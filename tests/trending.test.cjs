const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");

function service(read, configured = true) {
  return createLoader({
    env: configured ? { EXPO_PUBLIC_APPWRITE_DATABASE_ID: "test-database", EXPO_PUBLIC_APPWRITE_TABLE_ID: "test-table" } : {},
    mocks: {
      "@/lib/appwrite": { __esModule: true, default: configured ? {} : null },
      appwrite: { TablesDB: class { listRows() { return read(); } }, Query: { orderDesc: (key) => key, limit: (count) => count } },
    },
  })("services/appwrite.ts");
}

test("only a successful empty response means no trending results", async () => {
  const api = service(async () => ({ rows: [] }));
  assert.equal((await api.getTrendingMovies()).length, 0);
});

test("paused Appwrite is an unavailable state, without raw server details", async () => {
  const api = service(async () => { throw Object.assign(new Error("PRIVATE_MARKER"), { type: "project_paused", code: 403 }); });
  await assert.rejects(api.getTrendingMovies(), (error) => error.kind === "unavailable" && !error.message.includes("PRIVATE_MARKER"));
});

test("missing Appwrite configuration is distinct from empty results", async () => {
  const api = service(() => assert.fail("must not fetch"), false);
  await assert.rejects(api.getTrendingMovies(), (error) => error.kind === "configuration");
});

test("invalid row IDs and envelopes are not silently discarded", async () => {
  for (const response of [{}, { rows: null }, { rows: [{ search_term: "fixture", movie_id: "invalid", poster_url: "", title: "Fixture", count: 1 }] }]) {
    await assert.rejects(service(async () => response).getTrendingMovies(), (error) => error.kind === "invalid-response");
  }
});

test("legacy column aliases remain supported", async () => {
  const result = await service(async () => ({ rows: [{ SearchTerm: "fixture", MovieId: "1", PosterUrl: "", title: "Fixture", count: 2 }] })).getTrendingMovies();
  assert.equal(result[0].movie_id, 1);
});

test("network failures are distinct from permission failures", async () => {
  await assert.rejects(service(async () => { throw new Error(); }).getTrendingMovies(), (error) => error.kind === "network");
  await assert.rejects(service(async () => { throw { code: 403 }; }).getTrendingMovies(), (error) => error.kind === "http");
});

test("trending cancellation produces no empty fallback", async () => {
  const controller = new AbortController();
  const pending = service(() => new Promise(() => {})).getTrendingMovies(controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
