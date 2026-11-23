const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Run the real TypeScript modules with isolated storage/network dependencies.
// No application bundles, native binaries, or credentials are needed.
function createLoader({ env = {}, mocks = {}, fetch = global.fetch, setTimeout: schedule = setTimeout } = {}) {
  const cache = new Map();
  const root = path.resolve(path.dirname(module.filename), "..");
  function load(filename) {
    const fullPath = path.resolve(root, filename);
    if (cache.has(fullPath)) return cache.get(fullPath).exports;
    const module = { exports: {} };
    cache.set(fullPath, module);
    const source = ts.transpileModule(fs.readFileSync(fullPath, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
      return require(name);
    };
    vm.runInNewContext(source, {
      module, exports: module.exports, require: localRequire,
      process: { env }, fetch, setTimeout: schedule, clearTimeout,
      AbortController, URLSearchParams, Error, Promise, Set,
      console: { log() { throw new Error("Unexpected application log in stability test"); } },
    }, { filename: fullPath });
    return module.exports;
  }
  return load;
}

module.exports = { createLoader };
