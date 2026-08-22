#!/usr/bin/env node
/**
 * Copy Monaco's prebuilt AMD bundle into public/ so the editor loads from the
 * app itself instead of jsdelivr (the @monaco-editor/loader default). The
 * desktop app is offline-first; a CDN fetch per cold launch broke every editor
 * without network. Output is gitignored — runs from the pre* lifecycle hooks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(uiRoot, "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(uiRoot, "public", "monaco", "vs");

if (!fs.existsSync(src)) {
  console.error(`copy-monaco: ${src} missing — run pnpm install first`);
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("copy-monaco: public/monaco/vs refreshed");
