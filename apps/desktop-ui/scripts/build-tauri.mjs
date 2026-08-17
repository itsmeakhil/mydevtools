#!/usr/bin/env node
/**
 * Tauri desktop static-export build (apps/desktop-ui — desktop-only frontend,
 * output: 'export' is hard-coded in next.config.ts).
 *
 * Requires Node >= 20.19 (older 20.x fails the export with a misleading
 * `util.markAsUncloneable` error).
 *
 * Usage: node scripts/build-tauri.mjs   (from apps/desktop-ui or repo root)
 * Output: apps/desktop-ui/out/
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- Node version gate -----------------------------------------------------
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error(
    `build-tauri: Node ${process.versions.node} is too old — the static export fails on it ` +
      `(red-herring 'util.markAsUncloneable' error). Use Node >= 20.19, e.g. 'nvm use 20.19.5'.`
  );
  process.exit(1);
}

// Activation is mandatory: a desktop build without real Firebase credentials
// produces an app nobody can activate. Hard-fail rather than ship it.
// Next loads .env files itself; this check just guards CI/misconfigured shells.
const hasFirebaseKey =
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  [".env", ".env.local", ".env.production"].some((f) => {
    try {
      return fs.readFileSync(path.join(uiRoot, f), "utf8").includes("NEXT_PUBLIC_FIREBASE_API_KEY=");
    } catch {
      return false;
    }
  });
if (!hasFirebaseKey) {
  console.error(
    "build-tauri: NEXT_PUBLIC_FIREBASE_API_KEY is not set (env or .env file). Desktop " +
      "activation requires real Firebase credentials baked into the bundle — export the " +
      "NEXT_PUBLIC_FIREBASE_* vars before building."
  );
  process.exit(1);
}

const env = {
  ...process.env,
  TAURI_BUILD: "1",
  NEXT_PUBLIC_TAURI: "1",
};

const result = spawnSync("npx", ["next", "build"], {
  cwd: uiRoot,
  env,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error("build-tauri: next build failed.");
  process.exit(result.status ?? 1);
}

const outDir = path.join(uiRoot, "out");
// outDir is derived from this script's own location and quoted by JSON.stringify.
// threatcrush-disable-next-line js-shell-exec-interpolation
const pageCount = execSync(`find ${JSON.stringify(outDir)} -name '*.html' | wc -l`).toString().trim();
console.log(`build-tauri: OK — ${pageCount} HTML pages in apps/desktop-ui/out/`);
