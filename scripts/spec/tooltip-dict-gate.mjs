#!/usr/bin/env node
// Tooltip-dict drift gate — rebuilds and diffs public/spec-tooltips.json.
// Used by spec-gates workflow.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = 'public/spec-tooltips.json';
const before = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
execFileSync('node', ['scripts/spec/build-tooltip-dict.mjs'], { stdio: 'inherit' });
const after = readFileSync(OUT, 'utf8');

if (before !== after) {
  console.error('[tooltip-dict-gate] Drift: rebuild produced different output.');
  console.error('  Run: node scripts/spec/build-tooltip-dict.mjs && commit public/spec-tooltips.json');
  process.exit(1);
}
console.log('[tooltip-dict-gate] OK — tooltip dict up to date');
