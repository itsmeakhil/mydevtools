#!/usr/bin/env node
/**
 * Merges Navigation + Dashboard.tools keys from messages/en.json into every other locale
 * so next-intl never misses a tool label (fills from English when a locale lacks a key).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '../apps/web/messages');
const enPath = path.join(messagesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function mergeToolSection(target, source) {
  if (!target || typeof target !== 'object') return;
  if (!source || typeof source !== 'object') return;
  for (const key of Object.keys(source)) {
    if (target[key] === undefined) {
      target[key] = source[key];
    } else if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      mergeToolSection(target[key], source[key]);
    }
  }
}

for (const name of fs.readdirSync(messagesDir)) {
  if (!name.endsWith('.json') || name === 'en.json') continue;
  const p = path.join(messagesDir, name);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  mergeToolSection(j.Navigation, en.Navigation);
  if (!j.Dashboard) j.Dashboard = {};
  if (!j.Dashboard.tools) j.Dashboard.tools = {};
  mergeToolSection(j.Dashboard.tools, en.Dashboard.tools);
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

console.log('Synced Navigation + Dashboard.tools from en.json into all locales.');
