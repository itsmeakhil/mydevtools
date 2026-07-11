#!/usr/bin/env node
/**
 * Tauri desktop static-export build.
 *
 * Next's `output: 'export'` cannot build API route handlers, middleware, or
 * dynamic segments without generateStaticParams. Those are all server/marketing
 * surface the desktop app doesn't need, so this script moves them aside,
 * builds with TAURI_BUILD=1, and restores them afterwards (failure-safe).
 *
 * Requires Node >= 20.19 (older 20.x fails the export with a misleading
 * `util.markAsUncloneable` error). Run: `nvm use 20.19.5` (or 22+) first.
 *
 * Usage: node scripts/build-tauri.mjs   (from apps/web or repo root)
 * Output: apps/web/out/
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excludedRoot = path.join(webRoot, ".tauri-excluded");

// --- Node version gate -----------------------------------------------------
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error(
    `build-tauri: Node ${process.versions.node} is too old — the static export fails on it ` +
      `(red-herring 'util.markAsUncloneable' error). Use Node >= 20.19, e.g. 'nvm use 20.19.5'.`
  );
  process.exit(1);
}

// Paths (relative to apps/web) that cannot exist in a static export.
const EXCLUDES = [
  "src/app/api",          // 50 route handlers
  "src/middleware.ts",    // middleware unsupported in export
  "src/app/[username]",   // dynamic, no generateStaticParams
  "src/app/s",            // short-link redirect segment
  "src/app/blog",         // marketing, server data
  "src/app/compare",      // marketing, server data
  "src/app/tools",        // marketing, server data
  "src/app/llms.txt",     // route handler
  "src/app/robots.ts",    // useless in app bundle
  "src/app/sitemap.ts",   // useless in app bundle
];

function moveAside() {
  fs.mkdirSync(excludedRoot, { recursive: true });
  const moved = [];
  for (const rel of EXCLUDES) {
    const src = path.join(webRoot, rel);
    if (!fs.existsSync(src)) {
      console.warn(`build-tauri: skip missing exclude ${rel}`);
      continue;
    }
    const dest = path.join(excludedRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    moved.push(rel);
  }
  fs.writeFileSync(path.join(excludedRoot, "manifest.json"), JSON.stringify(moved, null, 2));
  return moved;
}

function restore() {
  if (!fs.existsSync(excludedRoot)) return;
  const manifestPath = path.join(excludedRoot, "manifest.json");
  const moved = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : EXCLUDES;
  for (const rel of moved) {
    const src = path.join(excludedRoot, rel);
    const dest = path.join(webRoot, rel);
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dest)) {
      console.error(`build-tauri: restore conflict — both ${rel} and its excluded copy exist; leaving copy in .tauri-excluded`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
  }
  // Remove the holding dir if fully drained.
  try {
    fs.rmSync(path.join(excludedRoot, "manifest.json"), { force: true });
    fs.rmSync(excludedRoot, { recursive: true }); // throws if non-empty leftovers
  } catch {
    /* leftovers preserved intentionally */
  }
}

// Recover from a previous crashed run BEFORE doing anything else.
if (fs.existsSync(excludedRoot)) {
  console.warn("build-tauri: found leftover .tauri-excluded from a previous run — restoring first.");
  restore();
}

let restored = false;
const restoreOnce = () => {
  if (restored) return;
  restored = true;
  restore();
};
process.on("SIGINT", () => { restoreOnce(); process.exit(130); });
process.on("SIGTERM", () => { restoreOnce(); process.exit(143); });
process.on("exit", restoreOnce);

const moved = moveAside();
console.log(`build-tauri: excluded ${moved.length} paths, building static export…`);

const env = {
  ...process.env,
  TAURI_BUILD: "1",
  NEXT_PUBLIC_TAURI: "1",
  // Firebase init runs at import time; keep placeholders only when unset so a
  // desktop build never hard-requires cloud credentials.
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "desktop-placeholder",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "desktop.invalid",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "desktop-placeholder",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "desktop.invalid",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "desktop-placeholder",
};

const result = spawnSync("npx", ["next", "build"], {
  cwd: webRoot,
  env,
  stdio: "inherit",
});

restoreOnce();

if (result.status !== 0) {
  console.error("build-tauri: next build failed (excluded paths have been restored).");
  process.exit(result.status ?? 1);
}

const outDir = path.join(webRoot, "out");
const pageCount = execSync(`find ${JSON.stringify(outDir)} -name '*.html' | wc -l`).toString().trim();
console.log(`build-tauri: OK — ${pageCount} HTML pages in apps/web/out/`);
