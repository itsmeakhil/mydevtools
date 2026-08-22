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

// Monaco must be served from the bundle, not jsdelivr (offline app).
const copyMonaco = spawnSync(process.execPath, [path.join(uiRoot, "scripts", "copy-monaco.mjs")], {
  stdio: "inherit",
});
if (copyMonaco.status !== 0) process.exit(copyMonaco.status ?? 1);

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
