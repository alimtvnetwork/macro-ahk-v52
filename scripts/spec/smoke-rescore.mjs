#!/usr/bin/env node
// Blind-AI smoke rescore — verifies every Q in BLIND-AI-SMOKE-TEST.md has a
// resolvable spec/... or mem://... reference. Fail if score < 20/20.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'spec/21-app/05-prompts/BLIND-AI-SMOKE-TEST.md';
const MEM_ROOT = '.lovable/memory';

if (!existsSync(FILE)) {
  console.error(`[smoke-rescore] Missing: ${FILE}`);
  process.exit(2);
}

const txt = readFileSync(FILE, 'utf8');
// Each question line begins with "Q<n>" — count refs on its line + next 2 lines.
const lines = txt.split('\n');
const qIndices = lines
  .map((l, i) => (/^\s*(?:[-*]\s*)?Q\d+\b/.test(l) ? i : -1))
  .filter(i => i >= 0);

const SPEC_RE = /\bspec\/[\w./-]+\.(?:md|json)\b/g;
const MEM_RE = /\bmem:\/\/[\w./-]+/g;

let pass = 0;
const failures = [];
for (const idx of qIndices) {
  const block = lines.slice(idx, idx + 4).join('\n');
  const refs = [...block.matchAll(SPEC_RE)].map(m => m[0])
    .concat([...block.matchAll(MEM_RE)].map(m => m[0]));
  const resolved = refs.some(r => {
    if (r.startsWith('mem://')) {
      const p = r.slice(6);
      return existsSync(join(MEM_ROOT, p + '.md')) || existsSync(join(MEM_ROOT, p));
    }
    return existsSync(r);
  });
  if (resolved) pass++;
  else failures.push(lines[idx].trim());
}

const total = qIndices.length;
console.log(`[smoke-rescore] ${pass}/${total} questions resolve to existing refs`);
if (failures.length) {
  console.error('[smoke-rescore] Unresolved:');
  failures.forEach(f => console.error(`  ${f}`));
}
if (pass < total) process.exit(1);
