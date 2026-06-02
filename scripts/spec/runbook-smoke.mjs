#!/usr/bin/env node
// Per-runbook smoke runner — validates that every top-15 reason code in
// observability/14 has a matching runbook section in observability/15.
// Fail-fast; no retry.
import { readFileSync, existsSync } from 'node:fs';

const QUICKREF = 'spec/21-app/05-prompts/macros/observability/14-error-taxonomy-quickref.md';
const RUNBOOKS = 'spec/21-app/05-prompts/macros/observability/15-runbooks-top15.md';

for (const f of [QUICKREF, RUNBOOKS]) {
  if (!existsSync(f)) { console.error(`Missing: ${f}`); process.exit(2); }
}

const codeRe = /\b([FRW]_[A-Z_]+)\b/g;
const codes = new Set([...readFileSync(QUICKREF, 'utf8').matchAll(codeRe)].map(m => m[1]));
const runbook = readFileSync(RUNBOOKS, 'utf8');

const missing = [...codes].filter(c => !runbook.includes(`## ${c}`));
if (missing.length) {
  console.error('[runbook-smoke] Missing runbook sections for:');
  missing.forEach(c => console.error(`  ${c}  (expected "## ${c}" heading in ${RUNBOOKS})`));
  process.exit(1);
}
console.log(`[runbook-smoke] OK — ${codes.size} reason codes all have runbooks`);
