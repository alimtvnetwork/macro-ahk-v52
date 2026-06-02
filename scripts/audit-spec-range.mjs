#!/usr/bin/env node
// Re-derives the numeric spec directory range so memory claims stay honest.
// Usage: node scripts/audit-spec-range.mjs [--json]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SPEC_DIR = 'spec';
const entries = readdirSync(SPEC_DIR)
  .filter((name) => /^\d{2}/.test(name))
  .filter((name) => statSync(join(SPEC_DIR, name)).isDirectory())
  .map((name) => ({ name, n: parseInt(name.slice(0, 2), 10) }))
  .sort((a, b) => a.n - b.n);

if (entries.length === 0) {
  console.error('[audit-spec-range] No numbered spec directories found.');
  process.exit(1);
}

const min = String(entries[0].n).padStart(2, '0');
const max = String(entries[entries.length - 1].n).padStart(2, '0');
const result = { min, max, count: entries.length, directories: entries.map((e) => e.name) };

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Spec range: ${min}–${max} (${entries.length} numbered dirs)`);
  console.log('If memory mem://architecture/spec-organization disagrees, update it.');
}
