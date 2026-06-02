#!/usr/bin/env node
// Spec cross-reference linter — scans spec/21-app/05-prompts/** for `spec/...`
// or `mem://...` references and verifies targets exist. Sequential fail-fast.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = 'spec/21-app/05-prompts';
const MEM_ROOT = '.lovable/memory';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(md|json)$/i.test(e)) out.push(p);
  }
  return out;
}

const SPEC_RE = /\b(spec\/[\w./-]+\.(?:md|json))\b/g;
const MEM_RE = /\bmem:\/\/([\w./-]+)/g;

const broken = [];
for (const file of walk(ROOT)) {
  const txt = readFileSync(file, 'utf8');
  for (const m of txt.matchAll(SPEC_RE)) {
    if (!existsSync(m[1])) broken.push({ file, ref: m[1], kind: 'spec-path' });
  }
  for (const m of txt.matchAll(MEM_RE)) {
    const candidates = [
      join(MEM_ROOT, m[1] + '.md'),
      join(MEM_ROOT, m[1]),
    ];
    if (!candidates.some(existsSync)) {
      broken.push({ file, ref: `mem://${m[1]}`, kind: 'mem-ref' });
    }
  }
}

if (broken.length) {
  console.error('[lint-cross-refs] Broken references:');
  for (const b of broken) console.error(`  ${b.file} -> ${b.ref} (${b.kind})`);
  process.exit(1);
}
console.log('[lint-cross-refs] OK — all references resolve');
