const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");

const {
  createPreferencesStorage,
  PREFERENCES_STORAGE_KEY,
  LEGACY_ONBOARDING_STORAGE_KEY,
  MOVIE_GENRE_CATALOGUE_STORAGE_KEY,
} = createLoader()("lib/preferencesStorage.ts");

const record = (genreIds = [], onboardingCompleted = true) => ({
  schemaVersion: 1, genreIds, onboardingCompleted,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

function fixture(entries = []) {
  const disk = new Map(entries);
  const writes = [];
  const reads = [];
  const storage = {
    async getItem(key) { reads.push(key); return disk.get(key) ?? null; },
    async setItem(key, value) { writes.push(key); disk.set(key, value); },
  };
  return { disk, writes, reads, storage, store: createPreferencesStorage(storage) };
}

test("new users have optional empty genres and incomplete onboarding without a write", async () => {
  const f = fixture();
  assert.deepEqual(plain(await f.store.load()), record([], false));
  assert.equal(f.writes.length, 0);
});

test("legacy users retain completed onboarding without forced migration writes", async () => {
  const f = fixture([[LEGACY_ONBOARDING_STORAGE_KEY, "1"]]);
  assert.deepEqual(plain(await f.store.load()), record());
  assert.equal(f.writes.length, 0);
  assert.equal(f.disk.get(LEGACY_ONBOARDING_STORAGE_KEY), "1");
});

test("TMDB genre catalogue can be cached separately for offline preference editing", async () => {
  const f = fixture();
  await f.store.saveGenreCatalogue([{ id: 28, name: "Action" }, { id: 12, name: "Adventure" }]);
  const restarted = createPreferencesStorage(f.storage);
  assert.deepEqual(plain(await restarted.loadGenreCatalogue()), [
    { id: 28, name: "Action" }, { id: 12, name: "Adventure" },
  ]);
  assert.equal(f.disk.has(PREFERENCES_STORAGE_KEY), false);
  assert.equal(f.disk.has(MOVIE_GENRE_CATALOGUE_STORAGE_KEY), true);
});

test("missing genre catalogue is distinct from an empty catalogue", async () => {
  assert.equal(await fixture().store.loadGenreCatalogue(), null);
  const f = fixture();
  await f.store.saveGenreCatalogue([]);
  assert.deepEqual(plain(await f.store.loadGenreCatalogue()), []);
});

test("invalid cached genres fail without replacing the previous catalogue", async () => {
  const original = JSON.stringify({ schemaVersion: 1, genres: [{ id: 28, name: "Action" }] });
  const f = fixture([[MOVIE_GENRE_CATALOGUE_STORAGE_KEY, original]]);
  await assert.rejects(f.store.saveGenreCatalogue([{ id: 0, name: "Invalid" }]));
  assert.equal(f.disk.get(MOVIE_GENRE_CATALOGUE_STORAGE_KEY), original);
  f.disk.set(MOVIE_GENRE_CATALOGUE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, genres: [{ id: "28", name: "Action" }] }));
  await assert.rejects(f.store.loadGenreCatalogue(), /saved movie genre list/i);
});

test("legacy unset flags retain the existing incomplete behavior", async () => {
  for (const legacy of ["0", "", "unexpected"]) {
    const f = fixture([[LEGACY_ONBOARDING_STORAGE_KEY, legacy]]);
    assert.equal((await f.store.load()).onboardingCompleted, false);
  }
});

test("the new record takes precedence over the legacy flag", async () => {
  const f = fixture([
    [PREFERENCES_STORAGE_KEY, JSON.stringify(record([28], false))],
    [LEGACY_ONBOARDING_STORAGE_KEY, "1"],
  ]);
  assert.deepEqual(plain(await f.store.load()), record([28], false));
  assert.deepEqual(f.reads, [PREFERENCES_STORAGE_KEY]);
});

test("completing onboarding saves deduplicated genres and completion in one write", async () => {
  const f = fixture();
  assert.deepEqual(plain(await f.store.completeOnboarding([28, 12, 28])), record([28, 12]));
  assert.deepEqual(f.writes, [PREFERENCES_STORAGE_KEY]);
  assert.deepEqual(JSON.parse(f.disk.get(PREFERENCES_STORAGE_KEY)), record([28, 12]));
});

test("onboarding may be completed without choosing genres", async () => {
  const f = fixture();
  assert.deepEqual(plain(await f.store.completeOnboarding([])), record());
});

test("preferences and completed onboarding survive a fresh storage instance", async () => {
  const f = fixture();
  await f.store.completeOnboarding([28, 12]);
  const restarted = createPreferencesStorage(f.storage);
  assert.deepEqual(plain(await restarted.load()), record([28, 12]));
});

test("genre edits preserve legacy completion and leave unrelated storage untouched", async () => {
  const f = fixture([
    [LEGACY_ONBOARDING_STORAGE_KEY, "1"],
    ["saved_movies_v1", "favorites fixture"],
    ["auth_state_v1", "local identity fixture"],
  ]);
  assert.deepEqual(plain(await f.store.saveGenres([35])), record([35]));
  assert.equal(f.disk.get(LEGACY_ONBOARDING_STORAGE_KEY), "1");
  assert.equal(f.disk.get("saved_movies_v1"), "favorites fixture");
  assert.equal(f.disk.get("auth_state_v1"), "local identity fixture");
  assert.deepEqual(f.writes, [PREFERENCES_STORAGE_KEY]);
});

test("saving genres alone does not mark a new user's onboarding complete", async () => {
  const f = fixture();
  assert.deepEqual(plain(await f.store.saveGenres([28])), record([28], false));
});

test("completion without a new selection preserves saved genres", async () => {
  const f = fixture([[PREFERENCES_STORAGE_KEY, JSON.stringify(record([28, 12], false))]]);
  assert.deepEqual(plain(await f.store.completeOnboarding()), record([28, 12]));
});

test("failed saves reject, retain prior preferences, and allow retry", async () => {
  const original = JSON.stringify(record([28]));
  const f = fixture([[PREFERENCES_STORAGE_KEY, original]]);
  const write = f.storage.setItem;
  f.storage.setItem = async () => { throw new Error("private storage detail"); };
  await assert.rejects(f.store.saveGenres([12]), (error) =>
    error.message.includes("Couldn't save") && !error.message.includes("private storage detail"));
  assert.equal(f.disk.get(PREFERENCES_STORAGE_KEY), original);
  f.storage.setItem = write;
  assert.deepEqual(plain(await f.store.saveGenres([12])), record([12]));
});

test("a pending write does not report success or complete onboarding prematurely", async () => {
  const f = fixture();
  let finish;
  f.storage.setItem = (key, value) => new Promise((resolve) => {
    finish = () => { f.disk.set(key, value); resolve(); };
  });
  let succeeded = false;
  const pending = f.store.completeOnboarding([28]).then(() => { succeeded = true; });
  await new Promise(setImmediate);
  assert.equal(succeeded, false);
  assert.equal(f.disk.has(PREFERENCES_STORAGE_KEY), false);
  finish();
  await pending;
  assert.equal(succeeded, true);
  assert.deepEqual(JSON.parse(f.disk.get(PREFERENCES_STORAGE_KEY)), record([28]));
});

test("failed completion does not mark a new user as onboarded", async () => {
  const f = fixture();
  f.storage.setItem = async () => { throw new Error(); };
  await assert.rejects(f.store.completeOnboarding([28]));
  assert.deepEqual(plain(await f.store.load()), record([], false));
});

test("concurrent genre edits and completion preserve invocation order", async () => {
  const f = fixture();
  await Promise.all([
    f.store.saveGenres([28]),
    f.store.completeOnboarding(),
    f.store.saveGenres([12, 35]),
  ]);
  assert.deepEqual(plain(await f.store.load()), record([12, 35]));
});

test("a failed queued save does not block a later save", async () => {
  const f = fixture();
  const write = f.storage.setItem;
  let first = true;
  f.storage.setItem = async (key, value) => {
    if (first) { first = false; throw new Error(); }
    return write(key, value);
  };
  const results = await Promise.allSettled([
    f.store.completeOnboarding([28]),
    f.store.completeOnboarding([12]),
  ]);
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].status, "fulfilled");
  assert.deepEqual(plain(await f.store.load()), record([12]));
});

test("read failures block writes rather than replacing unread preferences", async () => {
  for (const failingKey of [PREFERENCES_STORAGE_KEY, LEGACY_ONBOARDING_STORAGE_KEY]) {
    const f = fixture();
    const read = f.storage.getItem;
    f.storage.getItem = async (key) => {
      if (key === failingKey) throw new Error("private detail");
      return read(key);
    };
    await assert.rejects(f.store.completeOnboarding([28]), /Couldn't load/);
    assert.equal(f.writes.length, 0);
    f.storage.getItem = read;
    assert.deepEqual(plain(await f.store.completeOnboarding([28])), record([28]));
  }
});

test("corrupt, invalid, and future-schema records are preserved without legacy fallback", async () => {
  for (const raw of [
    "", "not json", "null", "[]", "{}",
    JSON.stringify({ ...record(), schemaVersion: 2 }),
    JSON.stringify({ ...record(), onboardingCompleted: "true" }),
    JSON.stringify({ ...record(), genreIds: ["28"] }),
  ]) {
    const f = fixture([[PREFERENCES_STORAGE_KEY, raw], [LEGACY_ONBOARDING_STORAGE_KEY, "1"]]);
    await assert.rejects(f.store.load(), /Couldn't load/);
    await assert.rejects(f.store.completeOnboarding([]), /Couldn't load/);
    assert.equal(f.disk.get(PREFERENCES_STORAGE_KEY), raw);
    assert.equal(f.writes.length, 0);
    assert.equal(f.reads.includes(LEGACY_ONBOARDING_STORAGE_KEY), false);
  }
});

test("invalid genre inputs never write or change existing preferences", async () => {
  const original = JSON.stringify(record([28]));
  const f = fixture([[PREFERENCES_STORAGE_KEY, original]]);
  for (const ids of [null, {}, ["28"], [0], [-1], [1.5], [NaN], [Infinity], [Number.MAX_SAFE_INTEGER + 1], Array(1)]) {
    await assert.rejects(f.store.saveGenres(ids), /invalid genres/);
    await assert.rejects(f.store.completeOnboarding(ids), /invalid genres/);
  }
  assert.equal(f.disk.get(PREFERENCES_STORAGE_KEY), original);
  assert.equal(f.writes.length, 0);
});

test("caller mutations do not alter queued selections or stored results", async () => {
  const f = fixture();
  const selected = [28];
  const pending = f.store.completeOnboarding(selected);
  selected.push(12);
  const result = await pending;
  result.genreIds.push(35);
  assert.deepEqual(plain(await f.store.load()), record([28]));
});

test("existing onboarding helpers read and complete the new record without losing genres", async () => {
  const f = fixture([
    [LEGACY_ONBOARDING_STORAGE_KEY, "1"],
    [PREFERENCES_STORAGE_KEY, JSON.stringify(record([28], false))],
  ]);
  const load = createLoader({ mocks: { "@react-native-async-storage/async-storage": f.storage } });
  const onboarding = load("lib/onboarding.ts");
  assert.equal(onboarding.ONBOARDING_STORAGE_KEY, LEGACY_ONBOARDING_STORAGE_KEY);
  assert.equal(await onboarding.getHasSeenOnboarding(), false);
  await onboarding.setHasSeenOnboarding();
  assert.equal(await onboarding.getHasSeenOnboarding(), true);
  assert.deepEqual(JSON.parse(f.disk.get(PREFERENCES_STORAGE_KEY)), record([28]));
  assert.equal(f.disk.get(LEGACY_ONBOARDING_STORAGE_KEY), "1");
});

test("existing onboarding helpers preserve legacy completed users", async () => {
  const f = fixture([[LEGACY_ONBOARDING_STORAGE_KEY, "1"]]);
  const load = createLoader({ mocks: { "@react-native-async-storage/async-storage": f.storage } });
  assert.equal(await load("lib/onboarding.ts").getHasSeenOnboarding(), true);
  assert.equal(f.writes.length, 0);
});
