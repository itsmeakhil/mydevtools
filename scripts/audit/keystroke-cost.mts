// Worst-legal-input main-thread cost of per-keystroke recomputes (Node = same V8 as Chrome).
// Run from repo root: node --experimental-strip-types scripts/audit/keystroke-cost.mts
import { findMatchRanges, MAX_TEST_TEXT_LENGTH } from '../../apps/desktop-ui/src/lib/regex-tester.ts';
import { buildLineDiffRows, countDiffRows, DIFF_MAX_INPUT_CHARS } from '../../apps/desktop-ui/src/lib/text-diff.ts';

const words = ['error', 'warn', 'info', 'debug', 'trace', 'user', 'id', 'value'];
let text = '';
while (text.length < MAX_TEST_TEXT_LENGTH - 100) {
  text += `[2026-07-16] ${words[text.length % 8]} message ${text.length} key=val${text.length % 97}\n`;
}
const t0 = performance.now();
for (let i = 0; i < 5; i++) findMatchRanges(text, '\\b(\\w+)=(\\w+)\\b', 'g');
const regexMs = (performance.now() - t0) / 5;

const lines = text.split('\n');
const left = lines.join('\n').slice(0, DIFF_MAX_INPUT_CHARS - 10);
const right = lines.map((l, i) => (i % 20 === 0 ? l + ' CHANGED' : l)).join('\n').slice(0, DIFF_MAX_INPUT_CHARS - 10);
const t1 = performance.now();
for (let i = 0; i < 3; i++) { const r = buildLineDiffRows(left, right); countDiffRows(r); }
const diffMs = (performance.now() - t1) / 3;

console.log(JSON.stringify({ regexTester200kMs: +regexMs.toFixed(1), diffChecker250kMs: +diffMs.toFixed(1) }));
