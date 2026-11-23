const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");
const { createSavedMoviesStorage, SAVED_MOVIES_STORAGE_KEY } = createLoader()("lib/savedMoviesStorage.ts");
const movie = (id) => ({ id, title: `Movie ${id}`, poster_path: null, vote_average: 7, release_date: "2026-01-01" });

function fixture(initial = null) {
  let disk = initial;
  let snapshot = null;
  const storage = {
    async getItem(key) { assert.equal(key, SAVED_MOVIES_STORAGE_KEY); return disk; },
    async setItem(key, value) { assert.equal(key, SAVED_MOVIES_STORAGE_KEY); disk = value; },
    async removeItem(key) { assert.equal(key, SAVED_MOVIES_STORAGE_KEY); disk = null; },
  };
  const store = createSavedMoviesStorage(storage, (value) => { snapshot = value; });
  return { storage, store, disk: () => disk, snapshot: () => snapshot };
}

test("favorites survive a fresh storage instance with the existing key", async () => {
  const f = fixture();
  await f.store.refresh();
  await f.store.save(movie(1));
  const restarted = fixture(f.disk());
  await restarted.store.refresh();
  assert.equal(restarted.snapshot()[0].id, 1);
});

test("save publishes no success before persistence completes", async () => {
  const f = fixture();
  await f.store.refresh();
  let finish;
  f.storage.setItem = () => new Promise((resolve) => { finish = resolve; });
  let settled = false;
  const operation = f.store.save(movie(1)).then(() => { settled = true; });
  await new Promise(setImmediate);
  assert.equal(f.snapshot().length, 0);
  assert.equal(settled, false);
  finish();
  await operation;
  assert.equal(f.snapshot()[0].id, 1);
});

test("failed save leaves persisted and visible favorites unchanged; retry works", async () => {
  const f = fixture(JSON.stringify([movie(1)]));
  await f.store.refresh();
  const write = f.storage.setItem;
  f.storage.setItem = async () => { throw new Error("fixture storage failure"); };
  await assert.rejects(f.store.save(movie(2)), /previous list is unchanged/);
  assert.equal(f.snapshot().length, 1);
  assert.equal(JSON.parse(f.disk()).length, 1);
  f.storage.setItem = write;
  await f.store.save(movie(2));
  assert.equal(f.snapshot().length, 2);
});

test("concurrent saves deduplicate and use the latest committed snapshot", async () => {
  const f = fixture();
  await f.store.refresh();
  await Promise.all([f.store.save(movie(1)), f.store.save(movie(1)), f.store.save(movie(2))]);
  assert.equal(f.snapshot().length, 2);
  assert.equal(new Set(JSON.parse(f.disk()).map((m) => m.id)).size, 2);
});

test("save, clear, and save are committed in invocation order", async () => {
  const f = fixture();
  await f.store.refresh();
  await Promise.all([f.store.save(movie(1)), f.store.clear(), f.store.save(movie(2))]);
  assert.equal(f.snapshot().length, 1);
  assert.equal(f.snapshot()[0].id, 2);
  assert.equal(JSON.parse(f.disk())[0].id, 2);
});

test("failed clear and remove preserve the old list", async () => {
  const f = fixture(JSON.stringify([movie(1)]));
  await f.store.refresh();
  f.storage.removeItem = async () => { throw new Error(); };
  await assert.rejects(f.store.clear());
  assert.equal(f.snapshot().length, 1);
  f.storage.setItem = async () => { throw new Error(); };
  await assert.rejects(f.store.remove(1));
  assert.equal(f.snapshot().length, 1);
  assert.equal(JSON.parse(f.disk()).length, 1);
});

test("read failures block overwrites and recover on retry", async () => {
  const f = fixture(JSON.stringify([movie(1)]));
  const read = f.storage.getItem;
  f.storage.getItem = async () => { throw new Error(); };
  await assert.rejects(f.store.refresh(), /Stored movies haven't been changed/);
  await assert.rejects(f.store.save(movie(2)), /retry loading/);
  assert.equal(JSON.parse(f.disk()).length, 1);
  f.storage.getItem = read;
  await f.store.refresh();
  await f.store.save(movie(2));
  assert.equal(f.snapshot().length, 2);
});

test("corrupt saved data is reported without silently replacing it", async () => {
  for (const raw of ["{bad json", "{}", JSON.stringify([{ id: 1 }])]) {
    const f = fixture(raw);
    await assert.rejects(f.store.refresh());
    await assert.rejects(f.store.clear());
    assert.equal(f.disk(), raw);
  }
});

test("legacy duplicate entries hydrate once per movie", async () => {
  const f = fixture(JSON.stringify([movie(1), movie(1)]));
  await f.store.refresh();
  assert.equal(f.snapshot().length, 1);
});

test("rapid toggles evaluate the latest snapshot", async () => {
  const f = fixture();
  await f.store.refresh();
  await Promise.all([f.store.toggle(movie(1)), f.store.toggle(movie(1))]);
  assert.equal(f.snapshot().length, 0);
  assert.equal(JSON.parse(f.disk()).length, 0);
});

test("a hanging storage read is bounded and can subsequently recover", async () => {
  let hanging = true;
  const load = createLoader({
    mocks: { "@react-native-async-storage/async-storage": { getItem: () => hanging ? new Promise(() => {}) : Promise.resolve("1") } },
    setTimeout: (fn, ms) => setTimeout(fn, ms === 8000 ? 5 : ms),
  });
  const { readStoredItem } = load("lib/storage.ts");
  await assert.rejects(readStoredItem("fixture"), /timed out/);
  hanging = false;
  assert.equal(await readStoredItem("fixture"), "1");
});
