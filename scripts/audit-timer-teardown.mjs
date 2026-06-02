#!/usr/bin/env node
// S60 — Timer & observer teardown audit.
// Greps installers (setInterval / setTimeout / new MutationObserver / addEventListener)
// and flags files that lack a paired teardown call (clearInterval / clearTimeout /
// .disconnect() / removeEventListener). Emits JSON for the Options audit panel.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'public', 'timer-teardown-audit.json');

const INSTALLERS = [
  { rx: /\bsetInterval\s*\(/g, pair: /\bclearInterval\s*\(/ },
  { rx: /\bsetTimeout\s*\(/g, pair: /\bclearTimeout\s*\(/ },
  { rx: /\bnew\s+MutationObserver\s*\(/g, pair: /\.disconnect\s*\(/ },
  { rx: /\.addEventListener\s*\(/g, pair: /\.removeEventListener\s*\(/ },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const findings = [];
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  for (const { rx, pair } of INSTALLERS) {
    const installs = (src.match(rx) || []).length;
    if (installs === 0) continue;
    const teardowns = (src.match(pair) || []).length;
    if (teardowns === 0) {
      findings.push({
        file: relative(ROOT, file),
        installer: rx.source,
        installs,
        teardowns,
      });
    }
  }
}

mkdirSync(join(ROOT, 'public'), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalFindings: findings.length,
  findings,
}, null, 2));

console.log(`timer-teardown audit: ${findings.length} files missing paired teardown`);
if (process.argv.includes('--strict') && findings.length > 0) process.exit(1);
