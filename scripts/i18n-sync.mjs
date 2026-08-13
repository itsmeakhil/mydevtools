#!/usr/bin/env node
/**
 * Sync locale JSON files against en.json by filling only missing keys.
 * - Never overwrites existing values
 * - Fixes type mismatches by replacing that subtree with en's subtree (safe default)
 *
 * Exit codes:
 * - 0: synced (or already OK)
 * - 1: error
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Defaults to the desktop UI (the app whose 27 locales carry the product);
// pass a different app dir to sync the marketing site instead.
const messagesDir = path.resolve(
  __dirname,
  '..',
  process.argv[2] ?? 'apps/desktop-ui/messages'
);
const enPath = path.join(messagesDir, 'en.json');

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/**
 * Returns { changed, missingCount, mismatchCount }
 */
function mergeMissing(target, source) {
  let changed = false;
  let missingCount = 0;
  let mismatchCount = 0;

  const visit = (t, s, key) => {
    // Missing key entirely
    if (t[key] === undefined) {
      t[key] = clone(s[key]);
      changed = true;
      missingCount += 1;
      return;
    }

    const tv = t[key];
    const sv = s[key];

    // If source is object, target must be object too (or we replace)
    if (isPlainObject(sv)) {
      if (!isPlainObject(tv)) {
        t[key] = clone(sv);
        changed = true;
        mismatchCount += 1;
        return;
      }
      for (const child of Object.keys(sv)) {
        visit(tv, sv, child);
      }
      return;
    }

    // If source is array, target must be array
    if (Array.isArray(sv)) {
      if (!Array.isArray(tv)) {
        t[key] = clone(sv);
        changed = true;
        mismatchCount += 1;
      }
      return;
    }

    // Primitive/null: ensure type matches; if mismatch, replace
    const svType = typeof sv;
    const tvType = typeof tv;
    if (sv === null) {
      if (tv !== null) {
        t[key] = null;
        changed = true;
        mismatchCount += 1;
      }
      return;
    }
    if (tv === null || svType !== tvType) {
      t[key] = clone(sv);
      changed = true;
      mismatchCount += 1;
    }
  };

  // root must be object
  if (!isPlainObject(source)) throw new Error('en.json root must be an object');
  if (!isPlainObject(target)) throw new Error('locale root must be an object');

  for (const k of Object.keys(source)) visit(target, source, k);

  return { changed, missingCount, mismatchCount };
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json') && f !== 'en.json');

let totalChangedFiles = 0;
let totalMissing = 0;
let totalMismatches = 0;

for (const file of files) {
  const p = path.join(messagesDir, file);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  const res = mergeMissing(json, en);
  totalMissing += res.missingCount;
  totalMismatches += res.mismatchCount;
  if (res.changed) {
    totalChangedFiles += 1;
    fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`);
  }
}

console.log(
  `i18n sync: ${totalChangedFiles} file(s) updated, ${totalMissing} missing key(s) added, ${totalMismatches} type mismatch(es) fixed.`
);

