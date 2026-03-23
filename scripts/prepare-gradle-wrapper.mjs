import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const wrapperPropsPath = path.join(
  repoRoot,
  "android",
  "gradle",
  "wrapper",
  "gradle-wrapper.properties",
);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readWrapperDistributionUrl(propsFilePath) {
  if (!fs.existsSync(propsFilePath)) {
    die(`Could not find: ${propsFilePath}`);
  }
  const content = fs.readFileSync(propsFilePath, "utf8");
  const line = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("distributionUrl="));
  if (!line) die(`Missing distributionUrl in: ${propsFilePath}`);

  const raw = line.slice("distributionUrl=".length);
  // Gradle wrapper properties escape ":" as "\:".
  const unescaped = raw.replace(/\\:/g, ":");
  return unescaped;
}

function computeWrapperHashBase36(distributionUrl) {
  // Wrapper uses safeUri(uri).toASCIIString() then MD5 then BigInteger(1, bytes).toString(36).
  const asciiUrl = new URL(distributionUrl).toString();
  const md5hex = crypto.createHash("md5").update(asciiUrl, "utf8").digest("hex");
  const asBigInt = BigInt(`0x${md5hex}`);
  return asBigInt.toString(36);
}

function cleanLocks(rootDir) {
  if (!fs.existsSync(rootDir)) return;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      cleanLocks(full);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".lck")) {
      try {
        fs.rmSync(full, { force: true });
      } catch {
        // ignore
      }
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const zipPath = args.zip;
if (!zipPath) {
  die("Usage: node scripts/prepare-gradle-wrapper.mjs --zip /path/to/gradle-*-bin.zip [--gradle-user-home .gradle-home] [--clean-locks]");
}

const gradleUserHome = path.resolve(repoRoot, args["gradle-user-home"] ?? ".gradle-home");
const shouldCleanLocks = Boolean(args["clean-locks"]);

if (!fs.existsSync(zipPath)) die(`Zip not found: ${zipPath}`);
if (!fs.statSync(zipPath).isFile()) die(`Not a file: ${zipPath}`);

const distributionUrl = readWrapperDistributionUrl(wrapperPropsPath);
const urlObj = new URL(distributionUrl);
const zipName = path.posix.basename(urlObj.pathname);
const distBaseName = zipName.includes(".") ? zipName.slice(0, zipName.lastIndexOf(".")) : zipName;
const hashBase36 = computeWrapperHashBase36(distributionUrl);

const distsRoot = path.join(gradleUserHome, "wrapper", "dists");
const distDir = path.join(distsRoot, distBaseName, hashBase36);
const destZipPath = path.join(distDir, zipName);

ensureDir(distDir);

if (shouldCleanLocks) {
  cleanLocks(distDir);
}

let copied = false;
if (fs.existsSync(destZipPath)) {
  const srcSize = fs.statSync(zipPath).size;
  const dstSize = fs.statSync(destZipPath).size;
  copied = srcSize !== dstSize;
  if (copied) fs.copyFileSync(zipPath, destZipPath);
} else {
  fs.copyFileSync(zipPath, destZipPath);
  copied = true;
}

process.stdout.write("Gradle wrapper local distribution cache prepared.\n");
process.stdout.write(`- wrapper properties: ${wrapperPropsPath}\n`);
process.stdout.write(`- distributionUrl: ${distributionUrl}\n`);
process.stdout.write(`- GRADLE_USER_HOME: ${gradleUserHome}\n`);
process.stdout.write(`- cached zip: ${destZipPath}${copied ? "" : " (already present)"}\n`);
process.stdout.write("\nNext:\n");
process.stdout.write(`- export GRADLE_USER_HOME="${gradleUserHome}"\n`);
process.stdout.write("- npx expo run:android\n");

