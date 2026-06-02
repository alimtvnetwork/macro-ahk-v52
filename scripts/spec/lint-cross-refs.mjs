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

// Require spec/ at start of token (not embedded in longer path like ".../audit-spec/...")
const SPEC_RE = /(?<![\w./-])(spec\/[\w./-]+\.(?:md|json))\b/g;
const MEM_RE = /\bmem:\/\/([\w./-]+)/g;

const hardFail = []; // spec/... paths must exist (hard fail)
const warn = [];     // mem://... refs — memory store is opaque, warn only

for (const file of walk(ROOT)) {
  const txt = readFileSync(file, 'utf8');
  for (const m of txt.matchAll(SPEC_RE)) {
    if (!existsSync(m[1])) hardFail.push({ file, ref: m[1] });
  }
  for (const m of txt.matchAll(MEM_RE)) {
    const candidates = [join(MEM_ROOT, m[1] + '.md'), join(MEM_ROOT, m[1])];
    if (!candidates.some(existsSync)) warn.push({ file, ref: `mem://${m[1]}` });
  }
}

if (warn.length) {
  console.warn(`[lint-cross-refs] ${warn.length} mem:// refs not in local mirror (memory store is opaque — informational):`);
  warn.slice(0, 5).forEach(w => console.warn(`  ${w.file} -> ${w.ref}`));
  if (warn.length > 5) console.warn(`  ... +${warn.length - 5} more`);
}
if (hardFail.length) {
  console.error('[lint-cross-refs] Broken spec/ references (must fix):');
  for (const b of hardFail) console.error(`  ${b.file} -> ${b.ref}`);
  process.exit(1);
}
console.log('[lint-cross-refs] OK — all spec/ paths resolve');
