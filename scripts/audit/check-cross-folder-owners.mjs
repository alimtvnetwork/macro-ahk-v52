#!/usr/bin/env node
// Enforces that specs mentioning cross-folder owned topics link to the owner mem:// URL.
// Owner registry lives in spec/2026-spec/OWNERS.md.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'spec/2026-spec';

const RULES = [
  {
    topic: 'verbose-logging',
    trigger: /\b(verbose logging|VerboseLogging)\b/,
    owners: [
      'mem://standards/verbose-logging-and-failure-diagnostics',
      'mem://features/verbose-logging-toggle',
    ],
  },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_audit-')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.md') && name !== 'OWNERS.md') out.push(p);
  }
  return out;
}

const failures = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const rule of RULES) {
    if (!rule.trigger.test(text)) continue;
    if (!rule.owners.some((o) => text.includes(o))) {
      failures.push(`${relative('.', file)} — missing owner link for "${rule.topic}" (one of: ${rule.owners.join(', ')})`);
    }
  }
}

if (failures.length) {
  console.error(`check-cross-folder-owners: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('check-cross-folder-owners: OK');
