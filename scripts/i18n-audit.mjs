#!/usr/bin/env node
/**
 * Audit locale JSON files against en.json.
 * Reports:
 * - missing keys
 * - type mismatches (object vs string/array/etc)
 *
 * Exit codes:
 * - 0: no issues
 * - 1: issues found
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '../apps/web/messages');
const enPath = path.join(messagesDir, 'en.json');

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function walk(enNode, localeNode, prefix, out) {
  if (isPlainObject(enNode)) {
    if (localeNode === undefined) {
      out.missing.push(prefix || '(root)');
      return;
    }
    if (!isPlainObject(localeNode)) {
      out.typeMismatches.push(prefix || '(root)');
      return;
    }
    for (const key of Object.keys(enNode)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      walk(enNode[key], localeNode[key], nextPrefix, out);
    }
    return;
  }

  // en is primitive/array/null -> locale must exist and match typeof/array-ness
  if (localeNode === undefined) {
    out.missing.push(prefix || '(root)');
    return;
  }
  const enIsArr = Array.isArray(enNode);
  const locIsArr = Array.isArray(localeNode);
  if (enIsArr !== locIsArr) {
    out.typeMismatches.push(prefix || '(root)');
    return;
  }
  if (!enIsArr && typeof enNode !== typeof localeNode) {
    out.typeMismatches.push(prefix || '(root)');
  }
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json') && f !== 'en.json');

let anyIssues = false;

for (const file of files) {
  const p = path.join(messagesDir, file);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  const out = { missing: [], typeMismatches: [] };
  walk(en, json, '', out);

  if (out.missing.length || out.typeMismatches.length) {
    anyIssues = true;
    console.log(`\n${file}`);
    for (const k of out.missing) console.log(`  - Missing: ${k}`);
    for (const k of out.typeMismatches) console.log(`  - Type mismatch: ${k}`);
  }
}

if (!anyIssues) {
  console.log('i18n audit: OK (no missing keys).');
  process.exit(0);
}

process.exit(1);

